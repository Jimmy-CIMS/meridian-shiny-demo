`%or%` <- function(x,y) if (is.null(x) || length(x)==0L) y else x
money <- function(x, compact=FALSE, digits=0) {
  if (compact && abs(x)>=1e6) return(sprintf('$%.2fM',x/1e6))
  if (compact && abs(x)>=1e3) return(sprintf('$%.1fK',x/1e3))
  paste0('$',format(round(x,digits),nsmall=digits,big.mark=',',scientific=FALSE,trim=TRUE))
}
filter_orders <- function(data, dates, region='All regions', channel='All channels', category='All categories') {
  keep <- data$date >= as.Date(dates[1]) & data$date <= as.Date(dates[2])
  if (region!='All regions') keep <- keep & data$region==region
  if (channel!='All channels') keep <- keep & data$channel==channel
  if (category!='All categories') keep <- keep & data$category==category
  data[keep,,drop=FALSE]
}
summarize_orders <- function(d) {
  revenue <- sum(d$revenue)
  list(revenue=revenue, orders=nrow(d), customers=length(unique(d$customer_id)),
       margin=if(revenue>0) 100*sum(d$revenue-d$cost)/revenue else 0,
       aov=if(nrow(d)>0) revenue/nrow(d) else 0)
}
group_values <- function(d, field, value='revenue') {
  if (!nrow(d)) return(list(labels=character(),values=numeric()))
  x <- aggregate(d[[value]],list(label=d[[field]]),sum)
  x <- x[order(x$x,decreasing=TRUE),]
  list(labels=x$label,values=round(x$x,2))
}
customer_summary <- function(d) {
  if (!nrow(d)) return(data.frame(customer_id=character(),revenue=numeric(),orders=integer(),segment=character()))
  r <- aggregate(revenue~customer_id,d,sum)
  o <- aggregate(order_id~customer_id,d,length)
  r$orders <- o$order_id[match(r$customer_id,o$customer_id)]
  r$segment <- ifelse(r$orders>=7,'Champions',ifelse(r$orders>=4,'Loyal',ifelse(r$orders>=2,'Returning','New')))
  r
}
scenario_projection <- function(d, price=0, discount=0, marketing=0, elasticity=1.2) {
  baseline <- summarize_orders(d)
  price_factor <- (1+price/100)*(1-discount/100)
  demand_factor <- max(.05,1-elasticity*(price_factor-1)+marketing/100*.35)
  revenue <- baseline$revenue*price_factor*demand_factor
  # Marketing is an incremental spend as a fraction of baseline revenue.
  spend <- baseline$revenue*(marketing/100)*.08
  cost <- sum(d$cost)*demand_factor
  list(revenue=revenue, profit=revenue-cost-spend, orders=round(nrow(d)*demand_factor),
       baseline_revenue=baseline$revenue, baseline_profit=sum(d$revenue-d$cost),marketing_spend=spend)
}
cohort_values <- function(d) {
  if (!nrow(d)) return(list(rows=character(),cols=character(),values=list()))
  month <- format(d$date,'%Y-%m')
  first <- tapply(month,d$customer_id,min)
  cohort <- unname(first[d$customer_id])
  months <- sort(unique(month))
  vals <- list()
  for (i in seq_along(months)) {
    members <- names(first)[first==months[i]]
    for (j in i:length(months)) {
      active <- length(unique(d$customer_id[month==months[j] & d$customer_id %in% members]))
      vals[[length(vals)+1L]] <- c(j-i,i-1,round(100*active/length(members)))
    }
  }
  list(rows=months, cols=paste0('M',0:(length(months)-1)),values=vals)
}
