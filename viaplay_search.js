const express = require("express")
const bodyParser = require("body-parser")
const elasticsearch = require("elasticsearch")
const fs = require('fs');
const axios = require("axios");

const app = express()
app.use(bodyParser.json())

app.listen(process.env.PORT || 3000, () => {
    console.log("connected")
})

const esClient = elasticsearch.Client({
    host: "http://127.0.0.1:9200",
})

const index_name = "viaplay"
const url = 'http://partner-catalogs.mtg-api.com/v2/api/subscription/movie/se/80973689678c86be6011d726bce84ab7/index.json'    
    

app.post("/index", async(req, res) => {
    
    try {
        // delete and recreate index
        try {
            await esClient.indices.delete({ index: index_name})
        } catch (err) {
            // index doesn't exist
        }
        
        await esClient.indices.create({index: index_name})

        // put mapping
        esClient.indices.putMapping({  
            index: index_name,
            body: {
                "properties": {
                    "genre": {
                      "type": "text",
                      "fields": {
                        "keyword": {
                          "type": "keyword",
                          "ignore_above": 256
                        }
                      }
                    },
                    "name": {
                      "type": "text",
                      "fields": {
                        "keyword": {
                          "type": "keyword",
                          "ignore_above": 256
                        },
                        "sv":{
                            "type": "text",
                            "analyzer": "swedish"
                        },
                        "fr":{
                          "type": "text",
                          "analyzer": "french"
                        },
                        "de":{
                          "type": "text",
                          "analyzer": "german"
                        },
                        "es":{
                          "type": "text",
                          "analyzer": "spanish"
                        },
                        "no":{
                          "type": "text",
                          "analyzer": "norwegian"
                        },
                        "it":{
                          "type": "text",
                          "analyzer": "italian"
                        }
                      }
                    },
                    "original_name": {
                      "type": "text",
                      "fields": {
                        "keyword": {
                          "type": "keyword",
                          "ignore_above": 256
                        },
                        "sv":{
                            "type": "text",
                            "analyzer": "swedish"
                        },
                        "fr":{
                          "type": "text",
                          "analyzer": "french"
                        },
                        "de":{
                          "type": "text",
                          "analyzer": "german"
                        },
                        "es":{
                          "type": "text",
                          "analyzer": "spanish"
                        },
                        "no":{
                          "type": "text",
                          "analyzer": "norwegian"
                        },
                        "it":{
                          "type": "text",
                          "analyzer": "italian"
                        }
                      }
                    }
                  }
            }
          },function(err,resp,status){
              if (err) {
                console.log(err);
              }
              else {
                console.log(resp);
              }
          });

        const response = await axios.get(url);
        const data = response.data;
        
        let bulk_body = []
        data['dataFeedElement'].forEach(item => {
            bulk_body.push({
              index: {
                _index: index_name,
                _id: item.guid
              }
            });

            bulk_body.push({
                original_name: item["item"]["name/original"],
                name: item["item"]["name"],
                genre: item["item"]["genre"]
            });
          });
        esClient.bulk({body: bulk_body})

        return res.json({"message": "Indexing successful"})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message": "Error: Indexing failed"})
    }
})


app.get("/search", (req, res) => {
    const searchText = req.query.text
    
    esClient.search({
        index: index_name,
        body: {
            query: {
                dis_max:{
                    queries:[
                        {
                            multi_match: {
                                query: searchText,
                                fields: [
                                        "name", "original_name",
                                        "name.sv", "original_name.sv",
                                        "name.fr", "original_name.fr",
                                        "name.de", "original_name.de",
                                        "name.es", "original_name.es",
                                        "name.no", "original_name.no",
                                        "name.it", "original_name.it"
                                      ],
                                minimum_should_match: "2<70%"
                            }
                        },
                        {
                            match: {
                                "genre":{
                                    query: searchText
                                }
                            }
                        }
                    ]
                }
            }
        }
    })
    .then(response => {
        return res.json(response['hits'])
    })
    .catch(err => {
        return res.status(500).json({"message": "Error"})
    })
})
