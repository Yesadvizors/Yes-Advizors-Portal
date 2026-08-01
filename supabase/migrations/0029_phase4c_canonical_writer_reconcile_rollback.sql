-- ############################################################################
-- ##  0029 ROLLBACK — no-op (documented). 0029 asserted only; nothing to undo. ##
-- ############################################################################
DO $noop$ BEGIN RAISE NOTICE '0029 rollback: no-op (assertion-only migration).'; END $noop$;
