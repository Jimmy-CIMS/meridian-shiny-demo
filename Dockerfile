FROM rocker/r-ver:4.4.3
RUN R -e "install.packages(c('shiny','bslib'), repos='https://cloud.r-project.org')"
WORKDIR /app
COPY app.R run.R ./
COPY R/ R/
COPY www/ www/
RUN useradd --create-home --uid 10001 meridian && chown -R meridian:meridian /app
USER meridian
ENV HOST=0.0.0.0 PORT=3838
EXPOSE 3838
CMD ["Rscript", "run.R"]
