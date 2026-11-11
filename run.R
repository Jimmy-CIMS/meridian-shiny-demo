port <- suppressWarnings(as.integer(Sys.getenv('PORT','3838')))
if(is.na(port) || port<1 || port>65535) stop('PORT must be an integer between 1 and 65535.')
shiny::runApp('.',host=Sys.getenv('HOST','127.0.0.1'),port=port,launch.browser=interactive())
