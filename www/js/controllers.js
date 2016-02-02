		angular.module('starter.controllers', ['ionic', 'ngCordova', 'starter.factories', 'restangular'])
		
		.run(function ($rootScope, $state, AuthService, AUTH_EVENTS) {
			$rootScope.$on('$stateChangeStart', function (event,next, nextParams, fromState) {
				if (!AuthService.isAuthenticated()) 
				{
					if (next.name != "login" && next.name != "cadastro") 
					{
						event.preventDefault();
						$state.go('login', {}, {location: 'replace', reload: true});
					}
				}
			});
			$rootScope.markerCache = [];
		})

		.controller('AppCtrl', function($scope, $state, $ionicModal, $ionicPopup, $timeout, $ionicHistory, LoginService, AUTH_EVENTS) {

		  $scope.$on(AUTH_EVENTS.notAuthenticated, function(event) {
			LoginService.logout();
			$state.go('login');
			var alertPopup = $ionicPopup.alert({
			  title: 'Viiixi',
			  template: 'Você vai precisar logar denovo :('
			});
		  });

		  $scope.isEstacionado = true;

		  $scope.logout = function() {
				LoginService.logout();
				$state.go('login', {}, {location: 'replace', reload: true});
				$ionicHistory.clearCache().then(function() {
				    $ionicHistory.clearHistory();
				    $ionicHistory.nextViewOptions({ disableBack: true, historyRoot: true });
				    $state.go('login', {}, {location: 'replace', reload: true});
				});
		  };
		  
		})

		.controller('TarifaAtualCtrl', function($scope, $state, $ionicPopup, Restangular) {
		  $scope.$on('$ionicView.enter', function(){
		  	$scope.carroEstacionado = {'tempo': '1h:15min', 'tarifa':'R$12,00', 'tarifaFechada': true};
		  	$scope.tarifaFechada = false;
		  	$scope.pagar = function(carroEstacionado) {
		  		Restangular.all("estacionamentos").post(carroEstacionado.id).then(function(response){
		  			if(response.status == 'ok')
		  			{
		  				var alertPopup = $ionicPopup.alert({
							title: 'Estacionamento pago!',
							template: 'O estacionamento foi pago com sucesso. O código de conferência é: ' + response.codigo + ''
						});	
		  			}
		  			else
		  			{
		  				var alertPopup = $ionicPopup.alert({
							title: 'Estacionamento ainda em aberto',
							template: 'Quando retirar o carro, o estacionamento dará baixa no sistema e você poderá efetuar o pagamento'
						});
		  			}
		  			
		  		}, function(err) {
		  			var alertPopup = $ionicPopup.alert({
						title: 'Erro ao efetuar pagamento',
						template: 'Não conseguimos efetuar o pagamento :('
					});
		  		});
		  	};

		  });
		  
		})

		.controller('EstacionamentosCtrl', function($scope, $rootScope, $ionicPopup, $cordovaGeolocation, $state, Restangular, MarkerService) {
			$scope.$on('$ionicView.enter', function(){
				
				Restangular.all("estacionamentos").getList({latitude: $rootScope.currentPosition.latitude, 
													       longitude: $rootScope.currentPosition.longitude})
				   .then(function(response) {
						$scope.estacionamentos = response;				
					},
					function(err) {
						$scope.pontos = 'Erro ao buscar os estacionamentos :(';
				});

				$scope.navegarEstacionamento = function(endereco){

					var posOptions = {
							enableHighAccuracy: true,
							timeout: 20000,
							maximumAge: 0
					};

					$cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) 
					{
						var directionsService = new google.maps.DirectionsService;
  						var directionsDisplay = new google.maps.DirectionsRenderer;
  						directionsDisplay.setMap($rootScope.map);

						directionsService.route({
						    origin: new google.maps.LatLng(position.coords.latitude, position.coords.longitude), 
						    destination: new google.maps.LatLng(endereco.latitude, endereco.longitude),
						    travelMode: google.maps.TravelMode.DRIVING,
						    
						  }, function(response, status) {
						    if (status === google.maps.DirectionsStatus.OK) {
						      directionsDisplay.setDirections(response);
						    } else {
						      var alertPopup = $ionicPopup.alert({
									title: 'Erro ao definir rota',
									template: 'Não conseguimos definir a rota para o estacionamento :('
							  });
							  console.log(status);
						    }
						  });
					}, function(err) {
							var alertPopup = $ionicPopup.alert({
									title: 'Erro ao definir rota',
									template: 'Não conseguimos definir a rota para o estacionamento :('
							});
							console.log(err);
					});
					$state.go('app.mapa');
				};			 
			});
		})
		.controller('PontosCtrl', function($scope, $ionicPopup, Restangular) {
			$scope.$on('$ionicView.enter', function(){
				Restangular.all("pontos").customGET('pt').then(function(response) {
					$scope.pontos = response.pontos;
					$scope.buscarEstacionamentosPromocao();				
				},
				function(err) {
					$scope.pontos = 'Erro ao buscar seus pontos :(';
				});

				$scope.obterPromocao = function(estacionamento){
					Restangular.all('estacionamento').customPOST(estacionamento, 'obterPromocao').then(function(response) {
						$scope.pontos = response.pontos;
						$scope.buscarEstacionamentosPromocao();
					}, 
					function(err) {
						var alertPopup = $ionicPopup.alert({
							title: 'Erro no cadastro',
							template: JSON.stringify(err)
						});
					});
				};

				$scope.buscarEstacionamentosPromocao = function() {
					Restangular.all("estacionamentos").customGET('promocao', {latitude: $rootScope.currentPosition.latitude, 
													       longitude: $rootScope.currentPosition.longitude})
				   .then(function(response) {
						$scope.estacionamentos = response;				
					},
					function(err) {
						$scope.pontos = 'Erro ao buscar os estacionamentos :(';
				});
				};
				 
			});
		})
		
		.controller('CadastroCtrl', function($scope, $state, $ionicPopup, AuthService) {
			
			$scope.cadastrar = function(data) {
				
				AuthService.cadastrar(data.nome, data.email, data.password).then(function(authenticated) {
					$state.go('app.mapa', {}, {reload: true});
					$scope.username =data.username;
				}, function(err) {
					var alertPopup = $ionicPopup.alert({
						title: 'Erro no cadastro',
						template: JSON.stringify(err)
					});
				});
			};
		})

		.controller('LoginCtrl', function($scope, $stateParams, $ionicPopup, $ionicLoading, $state, AuthService, GoogleService) {
			$scope.data = {};
 
			$scope.login = function(data) {
				AuthService.login(data.username, data.password).then(function(authenticated) {
					$state.go('app.mapa', {}, {reload: true});
					$scope.username =data.username;
				}, function(err) {
					var alertPopup = $ionicPopup.alert({
						title: 'Erro no login',
						template: 'Verifique suas informações'
					});
				});
			};
			
			$scope.goCadastrar = function() {
				$state.go('cadastro', {}, {reload: true});
			};

			$scope.googleSignIn = function() {
			    $ionicLoading.show({
			      template: 'Logging in...'
			    });

			    window.plugins.googleplus.login({}, function (user_data) {
			        // For the purpose of this example I will store user data on local storage
			        GoogleService.setUser({
			          	userID: user_data.userId,
			          	name: user_data.displayName,
			          	email: user_data.email,
			          	picture: user_data.imageUrl,
			          	accessToken: user_data.accessToken,
			          	idToken: user_data.idToken
			        });

			        $ionicLoading.hide();
			        $state.go('app.mapa');
			      },
			      function (msg) {
			        $ionicLoading.hide();
			      }
			    );
			};
			
		}).controller('MapaCtrl', function($scope, $cordovaGeolocation, $ionicLoading, $ionicPopup, $rootScope, $ionicTabsDelegate, ConnectivityMonitor, VagaService, MarkerService) {

			$scope.$on('$ionicView.enter', function(){
				$ionicTabsDelegate.select(0);
			});
			
			$scope.estacionar = function() {
				VagaService.estacionar($scope.myLat, $scope.myLong);
			};
			
			$scope.liberarVaga = function() {
				VagaService.liberarVaga($scope.myLat, $scope.myLong);
			};
			
			var loadGoogleMaps = function(){
				var script = document.createElement("script");
				script.type = "text/javascript";
				script.id = "googleMaps";
		 
				script.src = 'http://maps.google.com/maps/api/js?sensor=true&callback=mapInit';
				document.body.appendChild(script);


			};

			function getBoundingRadius(center, bounds){
			    return getDistanceBetweenPoints(center, bounds.northeast, 'km');    
			}
			 
			function getDistanceBetweenPoints(pos1, pos2, units){
			 
			    var earthRadius = {
			        miles: 3958.8,
			        km: 6371
			    };
			 
			    var R = earthRadius[units || 'miles'];
			    var lat1 = pos1.lat;
			    var lon1 = pos1.lng;
			    var lat2 = pos2.lat;
			    var lon2 = pos2.lng;
			 
			    var dLat = toRad((lat2 - lat1));
			    var dLon = toRad((lon2 - lon1));
			    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
			    Math.sin(dLon / 2) *
			    Math.sin(dLon / 2);
			    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			    var d = R * c;
			 
			    return d;
			 
			}
			 
			function toRad(x){
			    return x * Math.PI / 180;
			}

			function getIcone(tipoVaga) {
				if(tipoVaga == 'LIVRE') {
					return '/img/livre.png';
				}
				else if(tipoVaga == 'FAIXA_AZUL') {
					return '/img/azul.png';
				}
				else if(tipoVaga == 'FAIXA_VERMELHA') {
					return '/img/vermelho.png';
				}
				else if(tipoVaga == 'PISCA_ALERA_LIGADO') {
					return '/img/amarelo.png';
				}
				else if(tipoVaga == 'DEFICIENTE') {
					return '/img/deficiente.png';
				}
			}

			var carregarVagasEstacionamentos = function() {
				var center = $scope.map.getCenter();
      			var bounds = $scope.map.getBounds();
      			var zoom   = $scope.map.getZoom();

      			var centerNorm = {
			        lat: center.lat(),
			        lng: center.lng()
			    };

			    var boundsNorm = {
			        northeast: {
			            lat: bounds.getNorthEast().lat(),
			            lng: bounds.getNorthEast().lng()
			        },
			        southwest: {
			            lat: bounds.getSouthWest().lat(),
			            lng: bounds.getSouthWest().lng()
			        }
			    };

			    var boundingRadius = getBoundingRadius(centerNorm, boundsNorm);

			    var params = {
			        "centre": centerNorm,
			        "bounds": boundsNorm,
			        "zoom": zoom,
			        "boundingRadius": boundingRadius
			    };

			    VagaService.buscarVagas(params).then(function(vagas){

			    	for (var i = 0; i < vagas.length; i++) 
			    	{
			    		var vagaLatlng = new google.maps.LatLng(vagas[i].latitude, vagas[i].longitude);
			    		var vagaPosition;
						if(!vagas[i].isExcluir)
						{
							if(vagas[i].isVaga) {
			    				vagaPosition = MarkerService.adicionarMarker(vagaLatlng, getIcone(vagas[i].tipoVaga.name), map);

				    		} else {
				    			vagaPosition = MarkerService.adicionarMarker(vagaLatlng, '/img/parking.png', map);
				    		}
				    		MarkerService.adicionarinformacaoMarker(vagas[i].info, $scope.map);
				    		$rootScope.markerCache.push(vagaPosition);
						}
						else
						{
							var vagasExistentes = $rootScope.markerCache;
							for (var j = 0; j < vagasExistentes.length; j++)
							{
								if(vagasExistentes[j].position.latitude == vagas[i].latitude && vagasExistentes[j].position.longitude == vagas[i].longitude)
								{
									vagasExistentes[j].setMap(null);
									var i = rootScope.markerCache.indexOf(vagasExistentes[j]);
									if(i != -1) {
										$rootScope.markerCache.splice(i, 1);
									}
								}
							}
						}
					}		
			    }, 
			    function(err) {
			    	$ionicLoading.hide();
					console.log(err);
				});
			};
			
			if(ConnectivityMonitor.isOnline())
			{
				loadGoogleMaps();
				ionic.Platform.ready(function(){
					
					$ionicLoading.show({
						template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Procurando por vagas...'
					});
				
					var posOptions = {
							enableHighAccuracy: true,
							timeout: 20000,
							maximumAge: 0
					};
					
					$cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) 
					{
						var lat  = position.coords.latitude;
						var long = position.coords.longitude;
						$scope.myLat = lat;
						$scope.myLong = long;
						$rootScope.currentPosition = {latitude: lat, longitude: long};
						 
						myLatlng = new google.maps.LatLng(lat, long);
						 
						var mapOptions = {
							center: myLatlng,
							zoom: 18,
							mapTypeId: google.maps.MapTypeId.ROADMAP
						};          
						 
						var map;
						if($rootScope.map != null) {
							map = $rootScope.map;
						}
						else {
							map = new google.maps.Map(document.getElementById("map"), mapOptions);	
						}
						
						map.addListener('idle', function(){
						    carregarVagasEstacionamentos();      
						});

						$scope.map = map;
						$rootScope.map = map;
						var myPosition = MarkerService.adicionarMarker(myLatlng, '/img/car3.png', map);
						$scope.myPosition = myPosition;  
						$ionicLoading.hide();  
								 
					}, function(err) {
						$ionicLoading.hide();
						console.log(err);
						$ionicPopup.alert({
							title: 'Algum erro aconteceu :(',
							template: 'Não conseguimos identificar a sua posição :('
						});
					});

					$cordovaGeolocation.watchPosition(function(position)
					{
						var lat  = position.coords.latitude;
						var long = position.coords.longitude;
						myLatlng = new google.maps.LatLng(lat, long);
						$scope.myPosition.setPosition(myLatlng);
						carregarVagasEstacionamentos();
					}, 
					function(err) {
							$ionicLoading.hide();
							console.log(err);
							$ionicPopup.alert({
								title: 'Algum erro aconteceu :(',
								template: 'Não conseguimos identificar a sua posição :('
							});
						}, posOptions);
				});
			}
			else{
					if(ionic.Platform.isWebView()){
			 
					$rootScope.$on('$cordovaNetwork:online', function(event, networkState){
						checkLoaded();
					});
			 
					$rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
						$ionicLoading.show({
							template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Aguardando conexão com a internet...'
						});
					});
				}
				else 
				{
				  window.addEventListener("online", function(e) {
					if(typeof google == "undefined" || typeof google.maps == "undefined"){
					  loadGoogleMaps();
					} else {
					  $ionicLoading.hide();
					}
				  }, false);    
			 
				  window.addEventListener("offline", function(e) {
					$ionicLoading.show({
						template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Aguardando conexão com a internet...'
					});
				  }, false);  
				}
			}
		  }
		);
