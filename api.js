var express     = require( 'express'      ) ;
var request     = require( 'sync-request' ) ;
var cors        = require( 'cors'         ) ;
var jsonfile    = require( 'jsonfile'     ) ;
var _           = require( 'lodash'       ) ;
var bodyParser  = require( 'body-parser'  ) ;






//=============================================================================
// App Config Setup
//=============================================================================

var app = express() ; 
var port = process.env.PORT || 8080;

var http        = require( 'http'         ).Server( app ) ;
var io          = require( 'socket.io'    )( http ) ;

io.set('origins', '*:*');


app.use( cors(  )                                     ) ;
app.use( bodyParser.urlencoded( { extended: false } ) ) ; 
app.use( bodyParser.json()                            ) ;


// Config Setup for Websocket between phone and server
http.listen(port, function(){
  console.log('listening on *:' + port);
});

io.on('connection', function(socket){
  socket.on('message', function(msg){
    console.log('sending message back from server to all clients')
    io.emit('message', msg);
  });
});




//=============================================================================
// Access Code Definitions
//=============================================================================


//Walter Bishop
var wb                 = 'e930gP64ViFiWwDxfvP5DsAjXVkfkXgBJ9aB67ynqtFe37AgJlJgzLBKalgVl35r' ;
//Arjun Muhunthan 
var am                 = 'jPg45nv90P8v8o3EpXSMva03cklWnFVXaM0bXVzm25NxpXizcjdKNK10gKCevZoq' ;
// Nyota Uhura 
var nu                 = 'kwkZquzjcx6jfZEMqK6WBkw0o2RF8Ps2To7S9zZ6VBlbu4VDrgkyvYyScco3eaen' ;
var accessToken        = nu                                                                 ;
var txCacheFilename    = './json/txCache.json'                                              ;
var prodCacheFilename  = './json/prodCache.json'                                            ;
var productsFilename   = './json/products.json'                                             ;
var merchantsFilename  = './json/merchants.json'                                            ;


//=============================================================================
// API Declaration
//=============================================================================

app.post( '/api/consume/webhook'        , webhookConsumptionCbk ) ;

app.post( '/api/consume/qr'             , qrConsumptionCbk      ) ;

app.get ( '/api/getAllTransactions'     , getAllTxCbk           ) ;

app.get ( '/api/getAllProducts'         , getProductsCbk        ) ; 

app.get ( '/api/getProductsForTx/:txId' , getProductsForTxCbk   ) ;


app.get ( '/api/getSumPriceOfProds'        , getSumPriceOfProds   ) ;



//=============================================================================
// API Definitions
//=============================================================================

function getSumPriceOfProds( req, res)
{
	var allProductsInTx = jsonfile.readFileSync( prodCacheFilename ) ;

	var justProds = allProductsInTx.map( ( elem ) => { return { 
		'product' : elem.product ,
		'price' : elem.price
	} ; } ) ;

	var result =_.map( _.groupBy( justProds, 'product' ),(v, k) => ({ 
		      product: k,
	      	price: _.sumBy( v, 'price' )
	 		 }) );

	var total = 0 ; 


	for ( i = 0; i < result.length; ++i )
	{
		total += result[ i ].price ;
	}

	for ( i = 0; i < result.length; ++i )
	{
		result[ i ].percent = (result[ i ].price / total) * 100 ; 
	}


	console.log( result ) ;

	res.json( result ) ;

}

function webhookConsumptionCbk( req, res )
{

	var txData = {} ;

	txData.id = req.body.content.transactionUid ;
	txData.date = req.body.timestamp ;
	txData.value = Math.abs( req.body.content.amount ) ;
	txData.receipts = false ;
	txData.merchant = req.body.content.counterParty ;

	auxWebhookConsumption( txData ) ;

    res.status(200).send("receieved") ;

}

function qrConsumptionCbk( req, res)
{
	var body = JSON.parse(req.body) ;
	console.log( body ) ;


	var products = jsonfile.readFileSync( prodCacheFilename ) ;

	products = _.remove( products, { 'id' : body[0].id } ) ;

	products = products.concat( body ) ;

	jsonfile.writeFileSync( prodCacheFilename, products ) ;

	res.send( "receieved QR code" ) ;
}

function getProductsForTxCbk( req, res)
{

	var txId = req.params.txId ;

	var prodCache = jsonfile.readFileSync( prodCacheFilename ) ;

	var result = _.filter( prodCache, { 'id': txId } ) ;

	res.json( result ) ;

}

function getAllTxCbk( req, res )
{

	// THIS LOGIC IS SO CLOSE TO WORKING :(

	//TODO CHECK THIS LOGIC, IF TX DOESNT EXIST IN CACHCE, THEN PASS
	// IT THROUGHT THE WEBHOOK

	// var startlingTx = getTxFromStarlingAPI( accessToken ) ;

	// var notInCacheTx = getTxNotInCache( startlingTx ) ;

	// _.forEach( notInCacheTx, auxWebhookConsumption ) ;

	var allTxs = jsonfile.readFileSync( txCacheFilename ) ;

	res.status( 200 ).json ( allTxs ) ;
}



function getProductsCbk( req, res ) 
{
	var prodCache = jsonfile.readFileSync( prodCacheFilename ) ;

	res.json( prodCache ) ;
}


//=============================================================================
// Aux Functions
//=============================================================================


function getTxNotInCache( arrTx )
{
	var txCache = jsonfile.readFileSync( txCacheFilename ) ;

	//those Tx not in the cache
	var results = []

	for ( i = 0; i < arrTx.length; ++i )
	{
		var index = _.findIndex( txCache, [ 'id', arrTx[ i ].id ] ) ;

		if (index === -1)
		{
			results.push( arrTx[ i ] ) ;
		}
		
	}

	return results ;

}

function getRandMerchant()
{
	var merchants = jsonfile.readFileSync( merchantsFilename ) ;

	var index = Math.floor(Math.random() * merchants.length) ;

	return merchants[ index ] ;
}

function auxWebhookConsumption( txData )
{

	if (Math.random() < 0.5)
	{
		txData.receipts = true ;
		
		txData.merchant = getRandMerchant() ;

		generateProductDataForTx( txData.id, txData.value ) ;
	} 
	else
	{
		txData.merchant = "Amazon" ;
	}

	console.log( txData ) ; 

	io.emit("message", txData)	

	var today = new Date() ;
	var rand5 = Math.floor( Math.random() * 5 ) + 1 ;
	today.setDate( today.getDate() - rand5 ) ;

	txData.date = today.toISOString() ;


	updateTxCache( [ txData ] ) ;

}

function addNewPrice( arrOfPrices )
{
	var max   = _.max( arrOfPrices )       ;
	var index = arrOfPrices.indexOf( max ) ;
	
	arrOfPrices.splice( index, 1 ) ;


	// Just in case Math.Random comes back with 0, then default to 0.25
	var newPriceRatio1 = Math.random() || 0.25 ;
	var newPriceRatio2 = 1 - newPriceRatio1 ;

	arrOfPrices.push(newPriceRatio1 * max) ;
	arrOfPrices.push(newPriceRatio2 * max) ;

	return arrOfPrices ;

}

function getListOfProducts( numProds )
{
	var allProducts = jsonfile.readFileSync( productsFilename ) ;
	var results = [] ;

	for ( i = 0; i < numProds; ++i )
	{
		var index = Math.floor(Math.random() * allProducts.length)

		results.push( allProducts[ index ] ) ;

		allProducts.splice( index, 1 ) ;

	}

	return results;

}


function writeToTxProdsCache( arrOfTxProds )
{
	var txProds = jsonfile.readFileSync( prodCacheFilename ) ;

	txProds     = txProds.concat( arrOfTxProds ) ;

	txProds     = _.uniqBy( txProds, ( elem ) => { return elem['id'] + ' ' + elem['product'] } ) ;

	jsonfile.writeFileSync( prodCacheFilename, txProds ) ;

}

function generateProductDataForTx( txId, totalAmount )
{
	var numProds = Math.floor(Math.random() * 10) + 1 ;


	var max = totalAmount;

	var resultPrices = [totalAmount];

	while ( resultPrices.length < numProds )
	{
		resultPrices = addNewPrice( resultPrices ) ;
	}

	var resultProducts = getListOfProducts( resultPrices.length ) ;

	var results = [] ;

	for ( i = 0; i < resultPrices.length; ++i )
	{
		results.push( { 
			'id'      : txId,
			'price'   : Number(resultPrices[ i ]).toFixed( 2 ),
			'product' : resultProducts[ i ] 
		} ) ;
	}


	writeToTxProdsCache( results ) ;

}


function getTxFromStarlingAPI( actk )
{

	var result = request('GET', 'https://api-sandbox.starlingbank.com/api/v1/transactions/mastercard', {
  		'headers': {
    		    'Accept': 'application/json',
    			'Content-Type': 'application/json',
    			'Authorization': 'Bearer ' + actk
	  	}
	} );

	var sTxData = JSON.parse( result.getBody( 'utf8' ) )[ '_embedded' ][ 'transactions' ] ;


	var filteredSTxData = sTxData.map(
		(elem) => { return { 
					'date'     : elem.created          ,
					'value'    : Math.abs(elem.amount).toFixed( 2 ) ,
					'merchant' : elem.narrative        ,
					'id'       : elem.id    		   ,
					'receipts' : false
		 		  } 
		}
	);

	return filteredSTxData;

}

function updateTxCache( txs )
{

	//Concats Txs from Cache, and args, and gets uniq items
	var txCache = jsonfile.readFileSync( txCacheFilename ) ;
	txCache     = txCache.concat( txs )                    ;
	txCache     = _.uniqBy( txCache, 'id' )                ;

	jsonfile.writeFileSync( txCacheFilename, txCache ) ;

}


//=============================================================================
// Monzo OAuth Logic, If we need it, we'll use it
//=============================================================================

/*
app.get('/api/oauth', authCallback) ;

var client_id = 'oauthclient_00009Ila3HV0mDr9V0TEBd' ;
var client_secret = 'XzLnJsrFUxtYSzlOkIrOcCO9P817PMCiYYGwWtIFXC+lkzyKfTyzW7iZv/ma9JyxSbB9WmPlpZ3QPu6Cqt6n' ;
var redirect_uri = 'http://127.0.0.1:8000/api/oauth' ;

var url = 'https://api.getmondo.co.uk/oauth2/token' ;


function authCallback( req, res ) 
{

	var oauth = {
	 'grant_type'    : req.query.grant_type || 'authorization_code' ,
	 'client_id'     : client_id      ,
	 'client_secret' : client_secret  ,
	 'redirect_uri'  : redirect_uri   ,
	 [req.query.grant_type === 'refresh_token' ? 'refresh_token'         : 'code']        :
	  req.query.grant_type === 'refresh_token' ? req.query.refresh_token : req.query.code
	}
	
	console.log(oauth);
	
	request.post( 
		{ 
			'url'   : url   ,
			'form' : oauth
		}, 
		(err, response, body) => 
		{
		    if (!err && response.statusCode === 200) 
		    {
		      res.status(200).json( JSON.parse( body ) ) ;
		    } 
		    else 
		    {
		      res.status(response.statusCode).json( { message: body } ) ; 
		    }
		}
	) ;

}
*/
