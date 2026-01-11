resource "vercel_project_domain" "rindrics_com" {
  project_id = data.vercel_project.main.id
  domain     = "stock-assessment.rindrics.com"
}

resource "vercel_project_domain" "learn_to_live" {
  project_id = data.vercel_project.main.id
  domain     = "stock-assessment.learn-to.live"

  redirect             = vercel_project_domain.rindrics_com.domain
  redirect_status_code = 308
}
