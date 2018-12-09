# sparql-fiddle
**run SPARQL queries and stored procedures online or off**

The online app is fairly self-explanatory, so please take a look at it
to see the general operation.  () Below is an explanation of the library
that can be used in other apps. These notes on using the library are 
preliminary. I would REALLY like to hear comments about the API and 
ontology I talk about below.

## Overview

A fiddle, in the context of using sparql-fiddle as a coding library, is a data
structure which specifies an RDF data source, a SPARQL  query, and a 
results format.  The sparql-fiddle run() method runs the query against
the data source and displays or returns the results in the specified format.
The sparql-fiddle runFromLibrary() behaves similarly but retrieves the
fiddle from a Turtle file library of fiddles.


## Data and Query Sources

The RDF data source may be a string containing Turtle or other rdflib
parseable serialization, or it may be a URL pointing to a resource containing 
the serialization.

Likewise, the SPARQL query may be specified as a string containing the 
query or a URL pointing to such a string.

## Results as HTML or Text

The format for results is stored in the "wanted" key and may be one of "HTML",  "Text", "Array", "Hash", "Value"

An example:

```javascript
      const sf = require('sparql-fiddle') // or browser equivalent
      let fiddle = {
          data  : "http://example.com/myRDF",
          query : "http://example.com/mySPARQL",
         wanted : "HTML"
       }
       sf.run(fiddle).then( results => {
           console.log(results)
       }, err => console.log(err) )
       // 
       // output : an HTML table containing the results of the query
```       
The HTML format shows an HTML table of results.  Text shows fields
one per line with a space between records.  If neither of these
suits your purposes, you can ask for results as an Array or a Hash
and format or process them any way you'd like by iterating over the structure.

## Results as an Array

The "Array" format returns an array of hashes (associative arrays). Given 
"SELECT ?name ?addOn ...", the results would be something like

```javascript
[ 
     {"name":"Alu Gobi","addOn":"chutney" },
     {"name":"Reuben Sandwich","addOn":"dill pickle" }
]
```

## Results as a Hash

The Hash format returns a hash of hashes (associateve arrays). You need to
specify a key before calling run().  If you specify fiddle.key="name" 
the results would be something like this:

      ```javascript
      { 
         "Alu Gobi"        : {"name":"Alu Gobi","addOn":"chutney" },
         "Reuben Sandwich" : {"name":"Reuben Sandwich","addOn":"dill pickle" }
      }

The "Hash" format makes it very easy to read a Turtle config file into a
hash object in a script.

## Retrieving a Single Value

The "Value" format returns a single value.  It is meant to work with a
query that returns a single field in a single row.  If more than one row
is retrieved, only the first will be examined.  If more than one field is
retrieved, an arbitrary key will be returned.   Here's an example:

```javascript
const sf = require('sparql-fiddle')
let fiddle = {
      data:`@prefix : <http://schema.org/>. <> :name "hello world".`,
      query:`PREFIX : <http://schema.org/> SELECT ?y WHERE {?x :name ?y .}`,
      wanted:'Value'
}
sf.run(fiddle).then( res =>{ console.log(res) }, err => console.log(err) )
//
//  output : hello world
```
## Default Results Format

If no "wanted" key is supplied, the results format will default to "HTML" 
in a browser context and "Text" in a node context.

## Using N3 or RDF/XML 

If the data source is not Turtle, the fiddle should specify the dataType
as a mime content-type.

    fiddle.dataType = "application/rdf+xml"

## Row Handlers

If you wish to munge the data before the results are returned, 
specify a rowHandler function which will be applied to each row
during processing

    fiddle.rowHandler = function(row){
        for(r in row){ row[r] = row[r].toUpperCase() }
        return row
    }
    // values will be upper cased in results

By default, run() accumulates all rows and then returns the accumulated
results.  For very large results, this can eat up memory.  You can, instead,
handle each row as it is processed without accumulating anything.  To do
this, define a rowHandler which does what you need with each row but does
not return anything.

    fiddle.rowHandler = function(row){
        for(r in row){ console.log(r + " : " + row[r] + "\n" }
    }
    // displays rows one at a time, as they are processed, accumulates nothing

## Re-using a Store

If you want to run multiple queries against the same data, specify the data as
usual in the first run and set data to be an empty string in the following
runs.  In this case, the rdflib store object will be reused, thus avoiding
unnessary fetching and parsing which was already accomplished in the first
run.

## An Ontology for shareable Fiddle Libraries

Although I have not yet finalized the ontology, sparql-fiddle includes
a way to store and share fiddles between Solid sources. So let's say we
have a file "myLibrary.ttl" like this (ontology expressly omitted until 
I finalized it):

 @prefix : <#>
 <> a :FiddleLibrary.
 [] 
  a :Fiddle;
  :name "hello world";
  :data """@prefix s: <http://schema.com/>. <> s:name "hello Solid world".""";
  :query "PREFIX s: <http://schema.org/> SELECT ?msg WHERE {?x s:name ?msg.}"
.

We can now do this:

    let fiddleLibrary = "http://example.org/myLibrary.ttl"
    let options = {wanted:"Value"}
    sf.runFiddle( fiddleLibrary, "hello world", options ).then( results => {
        if( results === "hello Solid world" ) console.log("ok")
    }, err => console.log(err) )

The examples in the online app are all stored and retrieved from a
fiddle library.  Once an ontology is finalized, anyone will be able
to create and share fiddle libraries and the examples can grow with
community contributions. And other uses for fiddle libraries will
hopefully appear. They can be a kind of shared stored procedure library
for the community.  To make these most useful, I propose some
additional fields:

    :contributor   # name/email 
    :level         # beginner,intermediate,advance
    
    ... others? advice sought!

## Caveats & Plans

  * all SPARQL processing is based on rdflib.js which is not full SPARQL

  * I have not yet implemented a secondary fetcher.  This means that 
    the data endpoint is only the original URL and its fragments, the
    library will not (yet) go on to fetch additional URLs listed in the 
    original URL

Enjoy!

copyright (c) Jeff Zucker, 2018, released under MIT open source license







