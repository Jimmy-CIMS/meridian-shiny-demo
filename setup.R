# Install only missing or outdated dependencies into your configured R library.
required <- c(shiny='1.10.0', bslib='0.9.0', testthat='3.0.0')
needed <- names(required)[vapply(names(required),function(package) {
  !requireNamespace(package,quietly=TRUE) || packageVersion(package)<package_version(required[[package]])
},logical(1))]
if(length(needed)) install.packages(needed,repos='https://cloud.r-project.org')
cat('Meridian dependencies are ready. Run: Rscript run.R\n')
