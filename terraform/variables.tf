variable "vercel_project_name" {
  description = "Name of the Vercel project"
  type        = string
  default     = "mikazuki-munechika"
}

variable "vercel_api_token" {
  description = "API token for the Vercel project"
  type        = string
  sensitive   = true
}

variable "supabase_url_production" {
  description = "Supabase project URL for production"
  type        = string
  sensitive   = true
}

variable "supabase_anon_key_production" {
  description = "Supabase anonymous key for production"
  type        = string
}

variable "supabase_url_preview" {
  description = "Supabase project URL for preview"
  type        = string
  default     = "https://dummy.example.com" # no need to set in preview because it uses in-memory database
}

variable "supabase_anon_key_preview" {
  description = "Supabase anonymous key for preview"
  type        = string
  default     = "dummy" # no need to set in preview because it uses in-memory database
}

variable "supabase_url_development" {
  description = "Supabase project URL for development"
  type        = string
  sensitive   = true
  default     = "http://localhost:54321"
}

variable "supabase_anon_key_development" {
  description = "Supabase anonymous key for development"
  type        = string
  default     = "dummy" # will be updated by executing 'pnpm run sync-env'
}
