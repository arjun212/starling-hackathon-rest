var express     = require( 'express'      ) ;
var request     = require( 'sync-request' ) ;
var cors        = require( 'cors'         ) ;
var jsonfile    = require( 'jsonfile'     ) ;
var _           = require( 'lodash'       ) ;
var bodyParser  = require( 'body-parser'  );



var app = express() ; 
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;


app.use( cors(  )                                     ) ;
app.use( bodyParser.urlencoded( { extended: false } ) ) ; 
app.use( bodyParser.json()                            ) ;



app.post( '/api/consume/webhook', webhookConsumptionCbk ) ;

app.get( '/api/getAllTransactions', getAllTxCbk ) ;

app.get( '/api/getAllProducts', getProductsCbk ) ; 

app.get( '/api/getProductsForTx/:txid', getProductsForTx)




http.listen(port, function(){
  console.log('listening on *:' + port);
});

io.on('connection', function(socket){
  socket.on('message', function(msg){
    console.log('sending message back from server to all clients')
    io.emit('message', msg);
  });
});


//Walter Bishop
var accessToken       = 'jPg45nv90P8v8o3EpXSMva03cklWnFVXaM0bXVzm25NxpXizcjdKNK10gKCevZoq';
var txCacheFilename   = './json/txCache.json'                                             ;
var prodCacheFilename = './json/prodCache.json'                                           ;



function webhookConsumptionCbk( req, res )
{
	var txData = {} ;

	txData.id = req.body.content.transactionUid
	txData.date = req.body.timestamp
	txData.value = Math.abs( req.body.content.amount ) ;
	txData.merchant = req.body.content.counterParty ;
	txData.receipts = false ;

	if (Math.random() < 0.5)
	{
		txData.receipts = true ;
		generateProductDataForTx( txData.id, txData.value ) ;
	}

	updateTxCache( [ txData ] ) ;

	io.emit("message", txData)

    res.status(200).send("receieved") ;

}

function getProductsForTx( req, res)
{

	var txIdStr = req.params.txId ;

	var txId = Number( txIdStr ) ;

	if ( txId == NaN )
	{
		var errorStr = 'api/getTopProducts/ called with NaN (' 
		             + txIdStr 
		             + ') ' ; 

		console.error( errorStr ) ;

		res.status(400).send(errorStr) ;

		return ;
	}

	var result = [ 
					{ 'id'      : 1,
					  'price'   : 0.52,
					  'product' : 'Banana' 
					    },
					{ 'id'      : 1,
					  'price'   : 1.50,
					  'product' : 'Apple' 
					    },
					{ 'id'      : 1,
					  'price'   : 2.50,
					  'product' : 'Carrp' 
					    }
				] ;

	res.json(result);

}

function getAllTxCbk( req, res )
{

	var startlingTx = getTxFromStarlingAPI( accessToken ) ;

	updateTxCache( startlingTx ) ;

	var allTxs = getTxFromCache() ;

	res.status( 200 ).json ( allTxs ) ;
}



function getProductsCbk( req, res ) 
{
}


//=============================================================================
// Aux Functions
//=============================================================================




function generateProductDataForTx( txId, totalAmount )
{
	var numProds = Math.floor(Math.random() * 10) + 1 ;


	var singlePrice




	var n = 16;
	var a = [];
	while (n > 0) {
	  var s = Math.round(Math.random()*n);
	  a.push(s);
	  n -= s;
	}

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
					'value'    : Math.abs(elem.amount).toFixed(2) ,
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
