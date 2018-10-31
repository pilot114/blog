FROM ruby

RUN gem install jekyll bundler

WORKDIR /blog

EXPOSE 4000
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
CMD ["/bin/bash", "entrypoint.sh"]
