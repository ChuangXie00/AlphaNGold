ALTER TABLE my_proj_exp
    ADD CONSTRAINT chk_my_proj_exp_summary_zh_length
        CHECK (char_length(summary_zh) <= 1500),
    ADD CONSTRAINT chk_my_proj_exp_summary_en_length
        CHECK (char_length(summary_en) <= 1500);

CREATE INDEX idx_my_proj_exp_display_order_id
    ON my_proj_exp (display_order, id);