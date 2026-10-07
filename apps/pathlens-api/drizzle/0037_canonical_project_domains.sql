UPDATE "project_domains"
SET "domain" = 'https://' || "domain"
WHERE "domain" NOT LIKE 'http://%'
  AND "domain" NOT LIKE 'https://%';
