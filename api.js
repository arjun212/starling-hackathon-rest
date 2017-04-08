var express = require( 'express' ) ;
var request = require('sync-request');
var cors = require( 'cors' ) ;


var app = express() ; 
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 80;




// var corsOptions = {
//   origin: 'mas-starling-hackathon.herokuapp.com',
//   optionsSuccessStatus: 200
// }

app.use( cors(  ) ) ;

// app.use( express.logger() );

app.get( '/api/test', function(req, res){  console.log('TEST GOT CALLED'); res.send('hello');} ) ;

app.get( 'api/webhook', webhookCbk ) ;

app.get( 'api/consume/QR', qrConsumptionCbk ) ;

app.post( 'api/consume/webapp', webappConsumptionCbk ) ;

app.get( '/api/getAllTransactions', getAllTxCbk ) ;

app.get( 'api/getProducts/:txId', getProductsForTxCbk ) ; 




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
var accessToken = 'jPg45nv90P8v8o3EpXSMva03cklWnFVXaM0bXVzm25NxpXizcjdKNK10gKCevZoq';



function webhookCbk( req, res ) 
{
	res.status( 200 ).send( 'Webhook, Called' ) ;

	console.log( 'Webhook API Called Back, yay  :)' );
}


function qrConsumptionCbk( req, res )
{
	res.status( 200 ).send( 'qrConsumptionCbk, Called' ) ;
}

function webappConsumptionCbk( req, res )
{
	res.status( 200 ).send( 'WebConsumptionCbk, Called' ) ;

}

function getAllTxCbk( req, res )
{

	console.log('TXCBK ggot called') ;

	var startlingTx = getTxFromStarlingAPI( accessToken ) ;

	updateTxCache( startlingTx ) ;

	var allTxs = getTxFromCache() ;

	var allTxsInCorrectFormat = getTxIntoPOSTFormat( allTxs ) ;

	//TODO : LOGIC HERE
	res.status( 200 ).json ( startlingTx ) ;
	// res.status( 200 ).json( allTxsInCorrectFormat ) ;
}



function getProductsForTxCbk( req, res ) 
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

	//TODO : LOGIC TO GET TOP numProducts AND RETURN THAT

	res.status( 200 ).send('getTopProdcuts Called')
}


//=============================================================================
// Aux Functions
//=============================================================================


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

function getTxFromCache()
{
	return require('./json/cache')
}

function updateTxCache( txs )
{

	var txCache = getTxFromCache() ;

	for (tx in txs)
	{

	}



}

function getTxIntoPOSTFormat( Txs )
{

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