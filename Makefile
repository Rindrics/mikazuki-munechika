.PHONY: all install-pages build-pages pages clean lint lint-fix

# Install Jekyll dependencies (Ruby only)
install-pages-ruby:
	gem install jekyll bundler
	bundle install

# Install all dependencies (Ruby + Node.js)
install-pages: install-pages-ruby
	pnpm install

# Build Jekyll site
build-pages: install-pages-ruby
	JEKYLL_ENV=production jekyll build --baseurl "$(BASEURL)"

# Serve Jekyll site locally
pages: build-pages
	bundle exec jekyll serve

# Lint files
lint:
	pnpm run lint

# Fix linting issues
lint-fix:
	pnpm run lint:fix

# Clean build artifacts
clean:
	rm -rf _site .jekyll-cache .sass-cache
