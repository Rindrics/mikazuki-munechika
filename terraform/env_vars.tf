# Supabase

resource "vercel_project_environment_variables" "production" {
  project_id = data.vercel_project.main.id
  variables = [
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      value  = var.supabase_url_production
      target = ["production"]
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key_production
      target = ["production"]
    },
    {
      key    = "LOG_LEVEL"
      value  = "ERROR"
      target = ["production"]
    },
    {
      key    = "NEXT_PUBLIC_LOG_LEVEL"
      value  = "ERROR"
      target = ["production"]
    },
    {
      key    = "USE_IN_MEMORY_REPOSITORY"
      value  = "false"
      target = ["production"]
    },
    {
      key    = "NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY"
      value  = "false"
      target = ["production"]
    },
  ]
}

resource "vercel_project_environment_variables" "preview" {
  project_id = data.vercel_project.main.id
  variables = [
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      value  = var.supabase_url_preview
      target = ["preview"]
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key_preview
      target = ["preview"]
    },
    {
      key    = "LOG_LEVEL"
      value  = "DEBUG"
      target = ["preview"]
    },
    {
      key    = "NEXT_PUBLIC_LOG_LEVEL"
      value  = "DEBUG"
      target = ["preview"]
    },
    {
      key    = "USE_IN_MEMORY_REPOSITORY"
      value  = "true"
      target = ["preview"]
    },
    {
      key    = "NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY"
      value  = "true"
      target = ["preview"]
    },
  ]
}

resource "vercel_project_environment_variables" "development" {
  project_id = data.vercel_project.main.id
  variables = [
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      value  = var.supabase_url_development
      target = ["development"]
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key_development
      target = ["development"]
    },
    {
      key    = "LOG_LEVEL"
      value  = "DEBUG"
      target = ["development"]
    },
    {
      key    = "NEXT_PUBLIC_LOG_LEVEL"
      value  = "DEBUG"
      target = ["development"]
    },
    {
      key    = "USE_IN_MEMORY_REPOSITORY"
      value  = "false"
      target = ["development"]
    },
    {
      key    = "NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY"
      value  = "false"
      target = ["development"]
    },
  ]
}
