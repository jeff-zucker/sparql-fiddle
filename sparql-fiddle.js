if (typeof(module)!="undefined" && typeof($rdf)==="undefined")  $rdf = require('rdflib')

let SparqlFiddle = function(){
    let self = this;
    this.setRdfType = function(type){ this.rdfType = type }

    this.do = function(fiddle){
      return new Promise((resolve, reject)=>{
        this.parseRdf(fiddle).then( response => {
            this.prepare(fiddle).then( preparedQuery => {
                this.execute(fiddle,preparedQuery).then( results => {
                    self.store = fiddle.store 
                    if(fiddle.wanted==="Array"){
                        resolve(results)
                    }
                    else if(fiddle.wanted==="Hash") {
                        resolve( self.ary2hash(fiddle,results) )
                    }
                    else if(results.length < 1) {
                        resolve( "No results!"  )
                    }
                    else if(fiddle.wanted==="Value") {
                        let key = ( Object.keys(results[0])[0]  )
                        resolve( results[0][key] )
                    }
                    else { 
                        let formatted = self.displayHandler(fiddle,results)
                        resolve(formatted)
                    }  
                },err=>reject(err))
            },err=>reject(err))
        },err=>reject(err))
      })
    }
    this.ary2hash = function(fiddle,ary){
        let hash = {}
        for(a in ary){
            a = ary[a]
            hash[a[fiddle.key]] = a
        }
        return hash
    }
    this.parseRdf = function(fiddle){ return new Promise((resolve, reject)=>{
        if(!fiddle.data){
              return resolve();
        }
        let type = fiddle.dataType || "text/turtle"
        let endpointUrl = "http://example.org/inMemory"
        try {
            $rdf.parse(
                fiddle.data, fiddle.store, $rdf.sym(endpointUrl).uri, type
            )
            resolve()
        }
        catch(err) { reject(err) }
    })}
    this.prepare = function(fiddle){
        return new Promise((resolve, reject)=>{
            try {
              let query = $rdf.SPARQLToQuery(fiddle.query,false,fiddle.store)
              resolve(query)
            }
            catch(err) { reject(err) }
        })
    }
    this.execute =  function(fiddle,preparedQuery){
        let rowHandler = fiddle.rowHandler || self.rowHandler
        return new Promise((resolve, reject)=>{
            let wanted = preparedQuery.vars
            let resultAry = []
            fiddle.store.query(preparedQuery, results =>  {
                if(typeof(results)==="undefined") { reject("No results.") }
                else { 
                    let row = rowHandler(fiddle,wanted,results) 
                    if(row) resultAry.push(row)
                }
            }, {} , function(){resolve(resultAry)} )
        })
    }
    this.rowHandler = function(fiddle,wanted,results){
        row = {}
        for(r in results){
            let found = false
            let got = r.replace(/^\?/,'')
            if(wanted.length){
                for(w in wanted){
                    if(got===wanted[w].label){ found=true; continue }
                }
                if(!found) continue
            } 
            row[got]=results[r].value
        }
        if(fiddle.rowHandler){
            row = fiddle.rowHandler(row)
        }
        return(row)
    }
/*
  DATA DISPLAY
*/
    this.displayHandler = function(fiddle,results){
        let type = (fiddle.wanted)
                 ? fiddle.wanted
                 : (typeof(document)===undefined)
                   ? "Text"
                   : "HTML"
        if(type==="Text") return self.showText(results)
        if(type==="HTML") return self.showHtml(results)
    }
    this.showText = function(results){
        let columnHeads = Object.keys(results[0]).reverse()
        let str = "\n"
        for(r in results){
            let row = ""
            for(k in columnHeads){
                str += `${columnHeads[k]} : ${results[r][columnHeads[k]]}\n`
            }
            str += "\n"
        }
        return(str)
    }
    /* TBD : refactor to build a DOM object rather than a string
    */
    this.showHtml = function(results){
        let columnHeads = Object.keys(results[0]).reverse()
        let table = "<table>"
        let topRow = ""
        for(c in columnHeads){
            topRow += `<th>${columnHeads[c]}</th>`
        }
        table += `<tr>${topRow}</tr>`
        for(r in results){
            let row = ""
            for(k in columnHeads){
                row += `<td>${results[r][columnHeads[k]]}</td>`
            }
            table += `<tr>${row}</tr>`
        }
        table += "</table>"
        return(table)
    }
/* 
  USER FUNCTIONS
*/
/*
    PREFIX : <http://example.org/inMemory#>
    SELECT ?name ?format ?data ?query WHERE { 
        ?x :name ?name; :dataFormat ?format; :data ?data; :query ?query . 
    }
*/
    this.runFromLibrary = function( fiddleLibrary, fiddleName, options){
        return new Promise((resolve, reject)=>{
            let fiddle = {
              wanted : "Array",
                data : fiddleLibrary,
                query :`
    PREFIX : <http://example.org/inMemory#>
    SELECT ?type ?data ?query WHERE { 
        ?x :name "${fiddleName}"; :dataFormat ?type; :data ?data; :query ?query . 
    }
`,
            }
            self.run( fiddle ).then( fiddle => {
                let newFiddle = {
                    wanted : options.wanted,
                      data : fiddle[0].data,
                     query : fiddle[0].query,
                  dataType : fiddle[0].type
                }
                self.run( newFiddle ).then( results => {
                    resolve(results)
                }, err => reject(err) )
            }, err => reject(err) )
        }, err => reject(err) )
    }
    this.run = function(fiddle) { 
      return new Promise((resolve, reject)=>{
        fiddle.store = (fiddle.data.length>0)
                     ? $rdf.graph()
                     : self.store
        if( fiddle.data.match(/^http/ ) ){
            self.loadFromUrl(fiddle,"data").then( fiddle => {
                self.loadSparqlAndDo( fiddle ).then( results => {
                    resolve(results)
                }, err => reject(err) )
            }, err => reject(err) )
        }
        else {
            self.loadSparqlAndDo( fiddle ).then( results => {
                resolve(results)
            }, err => reject(err) )
        }
      })
    }
/* 
  DATA LOADING
*/
    this.loadSparqlAndDo = function( fiddle ) {
      return new Promise((resolve, reject)=>{
        if( fiddle.query.match( /^http/ ) ){
            this.loadFromUrl(fiddle,"query").then( fiddle => {
                self.do(fiddle).then( results => {
                    resolve(results)
                }, err => reject(err) )
            }, err =>  reject(err) )
        }
        else {
            this.do(fiddle).then( results => {
                resolve(results)
            }, err => reject(err) )
        }
      })
    }
    this.loadFromUrl = function(fiddle,type){
      let url = fiddle[type]
      return new Promise((resolve, reject)=>{
        let fetcher = new $rdf.fetcher( $rdf.graph() );
        try {
            fetcher.load(url).then( response => {
                // replace the url with it's content
                fiddle[type] = response.responseText
                resolve( fiddle )
            })
        } catch(err) { reject(err) }
      })
    }
    return this;
}
if (typeof(module)!="undefined" )  module.exports = SparqlFiddle()
