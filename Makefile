.PHONY: all install-pages build-pages pages clean

# Install Jekyll dependencies
install-pages:
	gem install jekyll bundler
	bundle install
	npm install

# Build Jekyll site
build-pages: install-pages
	JEKYLL_ENV=production jekyll build --baseurl "$(BASEURL)"

# Serve Jekyll site locally
pages: build-pages
	bundle exec jekyll serve

# Clean build artifacts
clean:
	rm -rf _site .jekyll-cache .sass-cache
