# Deterministic, synthetic transactions. No network or credentials required.
make_demo_data <- function(n = 16000L, seed = 42L) {
  set.seed(seed)
  dates <- seq(as.Date('2025-01-01'), as.Date('2025-12-31'), by = 'day')
  day <- sample(dates, n, replace = TRUE, prob = 1 + as.numeric(format(dates, '%m')) / 20)
  category <- sample(c('Home & living', 'Apparel', 'Beauty', 'Accessories'), n, TRUE, c(.34,.29,.22,.15))
  units <- sample(1:5, n, TRUE, c(.52,.27,.13,.06,.02))
  price <- c('Home & living'=84,'Apparel'=62,'Beauty'=38,'Accessories'=46)[category]
  revenue <- round(units * price * runif(n,.8,1.3),2)
  data.frame(order_id=sprintf('MR-%05d',seq_len(n)), date=day,
    customer_id=sprintf('C-%04d',sample(1:3600,n,TRUE)), category=category,
    region=sample(c('North America','Europe','Asia Pacific','Latin America'),n,TRUE,c(.41,.29,.22,.08)),
    channel=sample(c('Online store','Retail stores','Marketplace'),n,TRUE,c(.52,.31,.17)),
    units=units, revenue=revenue, cost=round(revenue * runif(n,.42,.71),2),
    stringsAsFactors=FALSE)
}
