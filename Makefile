.PHONY: all install-pages build-pages pages clean lint lint-fix

# Install Jekyll dependencies
install-pages:
	gem install jekyll bundler
	bundle install
	pnpm install

# Build Jekyll site
build-pages: install-pages
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
