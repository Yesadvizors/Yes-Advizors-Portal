-- ############################################################################
-- ##  0028 ROLLBACK — no-op (documented). 0028 asserted only; nothing to undo. ##
-- ############################################################################
DO $noop$ BEGIN RAISE NOTICE '0028 rollback: no-op (assertion-only migration).'; END $noop$;
