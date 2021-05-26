# Viaplay Search

Implementation of basic search functionality for viaplay movies.

## Data

I used the data from [this url](http://partner-catalogs.mtg-api.com/v2/api/subscription/movie/se/80973689678c86be6011d726bce84ab7/index.json).

## Searchable Fields

I search only *name*, *name/original* and *genre* for simplicity. 

My assumptions for that are:
  * Users will probably search a movie or series by name.
  * Users can also search for a specific genre: drama, documentary, etc. 
  * Other fields can be used for search too. For example, users may search movie or series of a specific actor or director. I thought this can be less frequent than the other two mentioned cases. 

## Indexing

One challnge of this dataset is having multiple languages per field. Movies' titles can be in different langauges so as user search queries.
To address this problem, I used multiple subfields for each field each one with a different language to cover (most of) the languages existing in the movie titles.

## Search Query

I assumed that users will either search for a specific genre or a movie title at a time. I created a *dis_max* query that combines two queries: one for name and name/original and one for genre.

### dis_max

a dis_max (disjoint max) query works by taking the maximum score of its subqueries. I think this is a suitable case for my assumption that users will search either titles or genres. This way we will try to match name and genere fields separately and top rankeded documents will be strongly matching one of the two fields. 

Ofcourse based on the user behavior we can find that users inted to mix multiple fields in searching, in this case we would use a boolean should query for example to add the scores of the subqueries. 

### *name* and *name/original* subquiries

As I mentioned before these fields can be of multiple languages. I created a *multi_match* query that search70%es all language subfields of *name* and *name/original*. The default way *multi_match* works is *best_field*, where the final score the maximum of all fields' scores, in this case the maximum matching language for the search query. 

I used a *minimum_should_match* parameter of *2<70%*. This means if the length of the query is 2 or less tokens, all of them should be matched. In case of more than 2 tokens, only 70% should be matched. This came form the assumption that if a user searches with 2 words this should have a lower probability of being mastaken than if he is searching with a longer query with multipel words. Again, all this paramaters and choices can be determined by analysing user search behavior. 

### *genre* query

As genre is a relatively simple field and consists usually of one weord, I used a simple match query. 

## How to use this repo

This repo have twp APIs one for indexing and one for search.

### Indexing (/index)

This API does the following:
  * Delete the exisitng viaplay index. 
  * Create a new indexing and explicitly adds the mappings. 
  * Get the data from the movies API.
  * Preprocess the data to select the fields that will be indexed for each document. 
  * Index all the documents with bulk indexing. 

To run the API use the following command:

```
curl --location --request POST 'http://localhost:3000/index' \
--header 'Content-Type: text/plain' \
--data-raw '{}'
```

The return message will be *"Indexing successful"* or *"Error: Indexing failed"*.

### Search (/search)

This is a simple *get* API to perform the search functionality. add the search query in the *text* parameter in the url. 
For example:
  ```
  http://localhost:3000/search/?text=The%20IMITATION%20GAME
  ```

The results will be the hits from elasticsearch in *json* format. Ideally this should be postprocessed depending on the required format. Also, some functionalities like highliting can be used. 

