-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_publication_atomic(UUID, INTEGER, INTEGER) TO authenticated;
