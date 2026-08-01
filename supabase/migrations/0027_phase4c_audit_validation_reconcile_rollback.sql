-- ############################################################################
-- ##  0027 ROLLBACK — no-op (documented). 0027 asserted only; nothing to undo. ##
-- ############################################################################
DO $noop$ BEGIN RAISE NOTICE '0027 rollback: no-op (assertion-only migration).'; END $noop$;
