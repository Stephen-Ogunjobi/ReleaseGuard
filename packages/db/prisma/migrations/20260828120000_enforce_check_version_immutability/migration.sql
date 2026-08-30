-- Prisma does not model immutable tables, so PostgreSQL provides the final guard.
-- Editing a check must insert another CheckVersion instead of rewriting history.
CREATE FUNCTION prevent_check_version_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'CheckVersion records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_version_immutable
BEFORE UPDATE OR DELETE ON "CheckVersion"
FOR EACH ROW
EXECUTE FUNCTION prevent_check_version_mutation();
