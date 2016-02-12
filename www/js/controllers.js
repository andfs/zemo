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
			$rootScope.positionCache = [];
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
		  	Restangular.all("pontos").customGET('pt').then(function(response) {
				$scope.carroEstacionado = response;
			},
			function(err) {
				var alertPopup = $ionicPopup.alert({
					title: 'Erro ao buscar informações',
					template: 'Não conseguimos buscar as informações :('
				});
			});
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

		.controller('VouchersCtrl', function($scope, $state, $ionicPopup, Restangular) {
		  $scope.$on('$ionicView.enter', function(){

		  	Restangular.all("vouchers").customGET('pt').then(function(response) {
				$scope.vouchers = response;
			},
			function(err) {
				var alertPopup = $ionicPopup.alert({
					title: 'Erro ao buscar vouchers',
					template: 'Não conseguimos buscar seus vouchers :('
				});
			});
		  	
		  	$scope.obterPromocao = function(estacionamento) {
		  		Restangular.all("vouchers").post(estacionamento.id).then(function(response){
	  				var alertPopup = $ionicPopup.alert({
						title: 'Voucher usado!',
						template: 'Seu código é: ' + response.codigo + ''
					});	
		  		}, function(err) {
		  			var alertPopup = $ionicPopup.alert({
						title: 'Erro ao usar voucher',
						template: 'Não conseguimos processar o uso de seu voucher :('
					});
		  		});
		  	};
		  });
		})

		.controller('EstacionamentosCtrl', function($scope, $rootScope, $ionicPopup, $cordovaGeolocation, $state, Restangular, MarkerService) {
			$scope.$on('$ionicView.enter', function(){
				
				Restangular.all("estacionamentos").getList({position: $rootScope.currentPosition}).then(function(response) {
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
      			var bounds = $scope.map.getBounds();

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

			    var params = {
			        "bounds": boundsNorm,
			    };

			    var contains = function(vagaLatlng) {
					for (var i = 0; i < $rootScope.positionCache.length; i++) {
						if($rootScope.positionCache[i].lat() == vagaLatlng.lat() && $rootScope.positionCache[i].lng() == vagaLatlng.lng()) {
							return true;
						}
					};
					return false;
				}

			    VagaService.buscarVagas(params).then(function(vagas){

			    	for (var i = 0; i < vagas.length; i++) 
			    	{
			    		var vagaLatlng = new google.maps.LatLng(vagas[i].latitude, vagas[i].longitude);
			    		var vagaPosition;

						if(!vagas[i].isExcluir && !contains($rootScope.positionCache, vagaLatlng))
						{
							if(vagas[i].isVaga) {
			    				vagaPosition = MarkerService.adicionarMarker(vagaLatlng, getIcone(vagas[i].tipoVaga), $scope.map);

				    		} else {
				    			vagaPosition = MarkerService.adicionarMarker(vagaLatlng, '/img/parking.png', $scope.map);
				    		}
				    		MarkerService.adicionarInformacaoMarker(vagas[i].info, $scope.map, vagaPosition);
				    		$rootScope.markerCache.push(vagaPosition);
				    		$rootScope.positionCache.push(vagaLatlng);
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
						$rootScope.currentPosition = {latitude: lat, longitude: long};
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
