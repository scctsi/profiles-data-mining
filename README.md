profiles-data-mining
====================

## Introduction
This is a node.js app that provides http based API to find out number of publications on all the concepts in Profiles Server in a particular year.

### Request format
`http://<server_addr>/pub_count/concepts/year/<year>`


## Profiles API formats

1. Get the list of all concepts. `req_all_concepts.xml`

2. Get the list of all publications on given concept. `req_all_pub_on_con.xml`

3. Grouping publications based on year of publication. `req_all_pub_on_con_in_yr.xml`
