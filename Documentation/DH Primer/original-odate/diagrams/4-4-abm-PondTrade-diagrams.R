
library(DiagrammeR)
library(DiagrammeRsvg)
library(magrittr)
library(svglite)
library(rsvg)
library(png)

start <- grViz("diagrams/4-4-abm-PondTrade-concept-start.dot")

start %>% export_svg %>% charToRaw %>% rsvg %>% png::writePNG("images/4-4-abm-PondTrade-concept-start.PNG")

step09 <- grViz("diagrams/4-4-abm-PondTrade-concept-step09.dot")

step09 %>% export_svg %>% charToRaw %>% rsvg %>% png::writePNG("images/4-4-abm-PondTrade-concept-step09.PNG")

step13 <- grViz("diagrams/4-4-abm-PondTrade-concept-step13.dot")

step13 %>% export_svg %>% charToRaw %>% rsvg %>% png::writePNG("images/4-4-abm-PondTrade-concept-step13.PNG")
