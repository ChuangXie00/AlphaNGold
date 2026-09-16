package com.ang.backend.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.util.Assert;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.LinkedHashMap;
import java.util.function.LongSupplier;


// TODO: 当前限流使用单实例内存计数，按当前连接来源限制请求频率，应用重启后额度会重置。部署多实例前，需要改为共享计数或统一入口限流。
// TODO: 若以后由 Nginx / 网关接管 IP 限流，评估移除本类中的限流逻辑。本类还包含拒绝当前API不必要请求体的逻辑，替换时需保留或迁移该保护。
// TODO: Azure 部署时核验代理链和真实客户端 IP；不要直接信任 X-Forwarded-For。
// TODO: 引入认证后，按需要增加用户或业务操作维度的额度限制。
// 在WebConfig中注册，Spring MVC识别这个Bean后，会在匹配请求进入Controller方法执行前调用它
// 不处理认证、不查询数据库、不读取客户端转发头。
public class ApiRequestInterceptor implements HandlerInterceptor {

    private record Bucket(double tokens, long lastSeen) {}

    private final boolean enabled;
    private final int burst;
    private final double perSecond;
    private final int maxClients;
    private final long idleSeconds;
    private final long idleNanos;
    private final LongSupplier clock;

    private final LinkedHashMap<String, Bucket> clients =
            new LinkedHashMap<>(16, 0.75f, true);

    public ApiRequestInterceptor(
            boolean enabled,
            int burst,
            double perSecond,
            int maxClients,
            long idleSeconds
    ) {
        this(enabled, burst, perSecond, maxClients,
                idleSeconds, System::nanoTime);
    }

    ApiRequestInterceptor(
            boolean enabled,
            int burst,
            double perSecond,
            int maxClients,
            long idleSeconds,
            LongSupplier clock
    ) {
        Assert.isTrue(burst > 0, "Rate-limit burst must be positive");
        Assert.isTrue(
                Double.isFinite(perSecond) && perSecond > 0,
                "Rate-limit per-second must be finite and positive"
        );
        Assert.isTrue(maxClients > 0, "max-clients must be positive");
        Assert.isTrue(idleSeconds > 0, "idle-seconds must be positive");

        this.enabled = enabled;
        this.burst = burst;
        this.perSecond = perSecond;
        this.maxClients = maxClients;
        this.idleSeconds = idleSeconds;
        this.idleNanos = Math.multiplyExact(
                idleSeconds, 1_000_000_000L
        );
        this.clock = clock;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        if (request.getDispatcherType() != DispatcherType.REQUEST) {
            return true;
        }

        response.setHeader("Cache-Control", "no-store");

        if (enabled) {
            long retryAfter = acquire(request.getRemoteAddr());

            if (retryAfter > 0) {
                response.setHeader(
                        "Retry-After", Long.toString(retryAfter)
                );
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many requests"
                );
            }
        }

        boolean acceptsBody = "POST".equals(request.getMethod())
                || "PUT".equals(request.getMethod());

        boolean hasBody = request.getContentLengthLong() > 0
                || request.getHeader("Transfer-Encoding") != null;

        if (!acceptsBody && hasBody) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This request must not contain a body"
            );
        }

        return true;
    }

    private synchronized long acquire(String address) {
        long now = clock.getAsLong();

        var iterator = clients.entrySet().iterator();
        while (iterator.hasNext()) {
            Bucket oldest = iterator.next().getValue();

            if (now - oldest.lastSeen() < idleNanos) {
                break;
            }
            iterator.remove();
        }

        Bucket previous = clients.get(address);

        if (previous == null && clients.size() >= maxClients) {
            return idleSeconds;
        }

        double available = previous == null
                ? burst
                : Math.min(
                burst,
                previous.tokens()
                + (now - previous.lastSeen())
                  / 1_000_000_000.0 * perSecond
        );

        if (available < 1) {
            clients.put(address, new Bucket(available, now));

            return Math.max(
                    1L,
                    (long) Math.ceil((1 - available) / perSecond)
            );
        }

        clients.put(address, new Bucket(available - 1, now));
        return 0;
    }
}