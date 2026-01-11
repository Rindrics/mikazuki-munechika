resource "vercel_project_domain" "rindrics_com" {
  project_id = data.vercel_project.main.id
  domain     = "stock-assessment.rindrics.com"
}

import {
  to = vercel_project_domain.rindrics_com
  id = "${data.vercel_project.main.id}/stock-assessment.rindrics.com"
}

resource "vercel_project_domain" "learn_to_live" {
  project_id = data.vercel_project.main.id
  domain     = "stock-assessment.learn-to.live"
}

import {
  to = vercel_project_domain.learn_to_live
  id = "${data.vercel_project.main.id}/stock-assessment.learn-to.live"
}
