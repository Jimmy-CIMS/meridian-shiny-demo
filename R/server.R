kpi <- function(label,value,note='',tone='neutral') tags$div(class='kpi',tags$span(class='kpi-label',label),tags$strong(class='kpi-value',value),tags$span(class=paste('kpi-note',tone),note))
kpi_row <- function(...) tags$div(class='kpi-row',...)
app_server <- function(input,output,session) {
  filtered <- reactive({
    req(input$dates, length(input$dates)==2, !anyNA(input$dates))
    filter_orders(orders,input$dates,input$region %or% 'All regions',input$channel %or% 'All channels')
  })
  explored <- reactive(filter_orders(filtered(),input$dates,category=input$category %or% 'All categories'))
  customers <- reactive(customer_summary(filtered()))
  projection <- reactive(scenario_projection(filtered(),input$price %or% 0,input$discount %or% 0,input$marketing %or% 0,input$elasticity %or% 1.2))
  observeEvent(input$reset,{
    updateDateRangeInput(session,'dates',start='2025-01-01',end='2025-12-31')
    updateSelectInput(session,'region',selected='All regions')
    updateSelectInput(session,'channel',selected='All channels')
    updateSelectInput(session,'category',selected='All categories')
  })
  observeEvent(input$reset_scenario,{
    updateSliderInput(session,'price',value=0); updateSliderInput(session,'discount',value=0)
    updateSliderInput(session,'marketing',value=0); updateSliderInput(session,'elasticity',value=1.2)
  })
  observeEvent(input$category_click,{
    if (input$category_click %in% unique(orders$category)) {
      updateSelectInput(session,'category',selected=input$category_click)
      session$sendCustomMessage('navigate','explore')
    }
  })
  observeEvent(input$region_click,{
    if (input$region_click %in% unique(orders$region)) updateSelectInput(session,'region',selected=input$region_click)
  })
  observeEvent(input$open_explore,session$sendCustomMessage('navigate','explore'))
  output$overview_kpis <- renderUI({
    s <- summarize_orders(filtered())
    kpi_row(kpi('TOTAL REVENUE',money(s$revenue,TRUE),'Across your selected period','positive'),
      kpi('ORDERS',format(s$orders,big.mark=','),'Every purchase, counted'),
      kpi('AVERAGE ORDER VALUE',money(s$aov),'Revenue per order'),
      kpi('GROSS MARGIN',sprintf('%.1f%%',s$margin),'Revenue less product costs','positive'))
  })
  output$insight <- renderUI({
    d <- filtered(); top <- group_values(d,'category')
    if (!nrow(d)) return(tagList(tags$h2('A fresh perspective awaits.'),tags$p('No orders match these filters. Expand your date range or reset your filters.')))
    share <- round(100*top$values[1]/sum(d$revenue))
    tagList(tags$h2(paste0(top$labels[1], ' leads the way.')),tags$p(paste0('At ',share,'% of revenue, it is your strongest category in this selection. Explore the details to see what is driving it.')),tags$div(class='insight-stat',paste0(share,'%'),tags$span('of selected revenue')))
  })
  output$explore_summary <- renderUI({
    s <- summarize_orders(explored())
    tags$div(class='context-note',tags$strong(paste(format(s$orders,big.mark=','),'orders in focus.')),paste(money(s$revenue),'in revenue across',length(unique(explored()$date)),'active selling days.'))
  })
  output$customer_kpis <- renderUI({
    c <- customers(); s <- summarize_orders(filtered())
    repeat_rate <- if(nrow(c)) 100*mean(c$orders>1) else 0
    kpi_row(kpi('ACTIVE CUSTOMERS',format(nrow(c),big.mark=','),'Unique customers in selection'),
      kpi('REPEAT PURCHASE RATE',sprintf('%.1f%%',repeat_rate),'Two or more orders in selection','positive'),
      kpi('SPEND PER CUSTOMER',money(if(nrow(c)) s$revenue/nrow(c) else 0),'Within the selected period'),
      kpi('CHAMPIONS',sum(c$segment=='Champions'),'Seven or more orders in selection'))
  })
  output$scenario_kpis <- renderUI({
    p <- projection(); change <- if(p$baseline_revenue) 100*(p$revenue/p$baseline_revenue-1) else 0
    kpi_row(kpi('PROJECTED REVENUE',money(p$revenue,TRUE),sprintf('%+.1f%% vs. baseline',change),if(change>=0)'positive' else 'negative'),
      kpi('PROJECTED PROFIT',money(p$profit,TRUE),paste('Baseline',money(p$baseline_profit,TRUE))),
      kpi('PROJECTED ORDERS',format(p$orders,big.mark=','),'Illustrative demand model'))
  })
  output$scenario_note <- renderUI({
    p <- projection()
    tags$div(class='context-note',tags$strong('Experiment, then validate.'),paste('Estimated incremental marketing spend:',money(p$marketing_spend),'. This model excludes fixed overhead, tax, and fulfillment constraints.'))
  })
  chart_payload <- reactive({
    d <- filtered(); e <- explored(); metric <- input$metric %or% 'revenue'
    months <- sort(unique(format(seq(as.Date(input$dates[1]),as.Date(input$dates[2]),by='day'),'%Y-%m')))
    monthly <- function(data,value) vapply(months,function(m) sum(data[[value]][format(data$date,'%Y-%m')==m]),numeric(1))
    labels <- format(as.Date(paste0(months,'-01')),'%b')
    rev <- monthly(d,'revenue'); profit <- rev-monthly(d,'cost'); p <- projection()
    scale <- if(sum(rev)>0) p$revenue/sum(rev) else 1
    cats <- group_values(d,'category'); regions <- group_values(d,'region'); channels <- group_values(d,'channel')
    c <- customers(); sample_c <- head(c[order(c$customer_id),],350)
    segments <- if(nrow(c)) {t <- table(factor(c$segment,levels=c('New','Returning','Loyal','Champions')));list(labels=names(t),values=as.numeric(t))} else list(labels=character(),values=numeric())
    heat <- list()
    if(nrow(e)) for (m in seq_along(months)) for(w in 0:6) heat[[length(heat)+1L]] <- c(m-1,w,sum(format(e$date,'%Y-%m')==months[m] & as.integer(format(e$date,'%u'))==w+1))
    list(
      'revenue-chart'=list(type='line',labels=labels,series=list(list(name='Revenue',values=rev),list(name='Gross profit',values=profit)),money=TRUE),
      'category-chart'=c(list(type='bars',click='category_click',money=TRUE),cats),
      'channel-chart'=c(list(type='donut',money=TRUE),channels),
      'region-chart'=c(list(type='bars',click='region_click',money=TRUE),regions),
      'sales-chart'=list(type='line',labels=labels,series=list(list(name=if(metric=='revenue') 'Revenue' else 'Units sold',values=monthly(e,metric))),money=metric=='revenue'),
      'product-chart'=c(list(type='bars',money=metric=='revenue'),group_values(e,'category',metric)),
      'weekday-chart'=list(type='heatmap',cols=labels,rows=c('Mon','Tue','Wed','Thu','Fri','Sat','Sun'),values=heat,suffix=' orders'),
      'customer-chart'=list(type='scatter',points=unname(lapply(seq_len(nrow(sample_c)),function(i)list(x=sample_c$orders[i],y=sample_c$revenue[i],label=sample_c$customer_id[i],segment=sample_c$segment[i])))),
      'segment-chart'=c(list(type='donut',money=FALSE),segments),
      'cohort-chart'=c(list(type='heatmap',suffix='%',percentage=TRUE),cohort_values(d)),
      'scenario-chart'=list(type='line',labels=labels,series=list(list(name='Baseline',values=rev),list(name='Scenario',values=rev*scale)),money=TRUE)
    )
  })
  observe({
    req(input$ui_ready)
    session$sendCustomMessage('charts',chart_payload())
  })
  report_rows <- reactive({
    d <- filtered(); q <- trimws(input$search %or% '')
    if(nchar(q)>0) {
      fields <- c('order_id','customer_id','category','region','channel')
      keep <- Reduce(`|`,lapply(d[fields],function(x) grepl(tolower(q),tolower(x),fixed=TRUE)))
      d <- d[keep,,drop=FALSE]
    }
    sorting <- input$sort %or% 'newest'
    idx <- if(sorting=='revenue') order(d$revenue,decreasing=TRUE) else order(d$date,decreasing=sorting!='oldest')
    d[idx,,drop=FALSE]
  })
  page <- reactiveVal(1L)
  observeEvent(list(input$search,input$sort,input$dates,input$region,input$channel),page(1L),ignoreInit=TRUE)
  observeEvent(input$previous,page(max(1L,page()-1L)))
  observeEvent(input$next_page,page(min(max(1L,ceiling(nrow(report_rows())/12)),page()+1L)))
  output$orders_table <- renderUI({
    d <- report_rows(); n <- nrow(d)
    if(!n) return(tags$div(class='empty-table',tags$h3('No orders found.'),tags$p('Try a different search, expand your dates, or reset your filters.')))
    p <- min(page(),ceiling(n/12)); rows <- d[seq.int((p-1)*12+1,min(p*12,n)),]
    tags$table(class='orders-table',tags$caption(class='sr-only','Filtered retail orders'),tags$thead(tags$tr(lapply(c('Order','Date','Customer','Category','Region','Channel','Revenue'),tags$th,scope='col'))),tags$tbody(lapply(seq_len(nrow(rows)),function(i) tags$tr(tags$td(rows$order_id[i]),tags$td(format(rows$date[i],'%b %d, %Y')),tags$td(rows$customer_id[i]),tags$td(rows$category[i]),tags$td(rows$region[i]),tags$td(tags$span(class='channel-pill',rows$channel[i])),tags$td(class='amount',money(rows$revenue[i],digits=2))))))
  })
  output$table_count <- renderText({n <- nrow(report_rows());p <- min(page(),max(1,ceiling(n/12)));paste(if(n) paste0((p-1)*12+1,'–',min(p*12,n)) else '0','of',format(n,big.mark=','),'orders')})
  output$page_number <- renderText(paste('Page',min(page(),max(1,ceiling(nrow(report_rows())/12))),'of',max(1,ceiling(nrow(report_rows())/12))))
  output$download_orders <- downloadHandler(filename=function()paste0('meridian-orders-',Sys.Date(),'.csv'),content=function(file)write.csv(report_rows(),file,row.names=FALSE),contentType='text/csv')
  output$download_summary <- downloadHandler(filename=function()paste0('meridian-monthly-',Sys.Date(),'.csv'),content=function(file){
    d <- report_rows()
    if(nrow(d)) {
      d$month <- format(d$date,'%Y-%m')
      summary <- aggregate(cbind(revenue,cost,units)~month,d,sum)
      counts <- aggregate(order_id~month,d,length)
      summary$orders <- counts$order_id[match(summary$month,counts$month)]
      summary$gross_profit <- summary$revenue-summary$cost
    } else summary <- data.frame(month=character(),revenue=numeric(),cost=numeric(),units=integer(),orders=integer(),gross_profit=numeric())
    write.csv(summary,file,row.names=FALSE)
  },contentType='text/csv')
}
