angular.module('starter.factories', ['ionic', 'ngCordova', 'restangular'])

.config(function(RestangularProvider) {
  
  RestangularProvider.setBaseUrl('http://localhost:8080/testeForge/rest');
  
})

.config(function ($httpProvider) {
  $httpProvider.interceptors.push('AuthInterceptor');
})
.constant('AUTH_EVENTS', {
  notAuthorized: 'auth-not-authorized'
})
.constant('LOCAL_TOKEN_KEY', {
  key: 'zimoTokenKey'
})

.factory('LoginService', function(GoogleService, AuthService) {

  var logout = function(tipoLogin) {
   	if(window.localStorage.getItem('tipoLogin') == 'google') {
   		GoogleService.logout();
   	}
   	else if(window.localStorage.getItem('tipoLogin') == 'proprio') {
   		AuthService.logout();
   	}
  };

  return {
    logout: logout
  };
})

.factory('GoogleService', function(Restangular) {

  var setUser = function(user_data) {
    	window.localStorage.starter_google_user = JSON.stringify(user_data);
    	window.localStorage.setItem('tipoLogin', 'google');
    	Restangular.setDefaultHeaders({Authorization:'Bearer google '+ resp.token});
  };

  var getUser = function(){
    return JSON.parse(window.localStorage.starter_google_user || '{}');
  };

  var logout = function() {
  	window.localStorage.starter_google_user = null;
  	window.plugins.googleplus.logout(function (msg) {
			console.log(msg);
		},
		function(fail){
			console.log(fail);
		}	
	);
  };

  return {
    getUser: getUser,
    setUser: setUser,
    logout: logout
  };
})

.factory('AuthService', function($q, Restangular){
	var LOCAL_TOKEN_KEY = 'zimoTokenKey';
	var username = '';
	var role = '';
	var autenticado = false;
	var authToken;
	
	function loadUserCredentials() {
		var token = window.localStorage.getItem(LOCAL_TOKEN_KEY);
		if (token != null) {
		  useCredentials(token);
		}
	}
	
	function storeUserCredentials(token) {
		window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
		useCredentials(token);
    }
	
	function useCredentials(token) {
		username = token.split('.')[0];
		autenticado = true;
		authToken = token;
		window.localStorage.setItem('tipoLogin', 'proprio');	 
	}
	
	function destroyUserCredentials() {
		authToken = undefined;
		username = '';
		autenticado = false;
		//$http.defaults.headers.common['Bearer'] = undefined;
		window.localStorage.removeItem(LOCAL_TOKEN_KEY);
	}
	
	var login = function(name, pw) {
		return $q(function(resolve, reject) {
		  
		  Restangular.all('usuarios').customPOST({email: name, senha: pw}, 'login', {}, {}).then(function(resp){
			storeUserCredentials(resp.token);
			Restangular.setDefaultHeaders({Authorization:'Bearer proprio '+ resp.token});
			resolve('Login success.');
		  }, function error(err) {
				reject('Login Failed.');
			});
		  
		});
	};
	
	var cadastrar = function(name, email, senha) {
		return $q(function(resolve, reject) {
			
		  Restangular.all('usuarios').customPOST({email: email, senha: senha, nome: name}, 'create', {}).then(function(resp){
			storeUserCredentials(resp.token);
			Restangular.setDefaultHeaders({Authorization:'Bearer proprio '+ resp.token});
			resolve('Cadastro success.');
		  }, function error(err) {
				reject(err);
			});
		  
		});
	};
	
	var logout = function() {
		destroyUserCredentials();
	};
	
	var isAuthenticated = function() {
		loadUserCredentials();
		if(autenticado) {
			return true;
		}
		return false;
	};
	
	return {
		login: login,
		logout: logout,
		cadastrar: cadastrar,
		isAuthenticated: isAuthenticated,
		username: function() {return username;},
		role: function() {return role;}
    };
})

.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
  return {
    responseError: function (response) {
      $rootScope.$broadcast({
        401: AUTH_EVENTS.notAuthenticated
      }[response.status], response);
      return $q.reject(response);
    }
  };
})
 
.factory('ConnectivityMonitor', function($cordovaNetwork){
	return {
		isOnline: function(){
		  if(ionic.Platform.isWebView()){
			return $cordovaNetwork.isOnline();    
		  } else {
			return navigator.onLine;
		  }
	 
		},
		ifOffline: function(){
	 
		  if(ionic.Platform.isWebView()){
			return !$cordovaNetwork.isOnline();    
		  } else {
			return !navigator.onLine;
		  }
	 
		}
	}
})

.factory('MarkerService', function(){
	return {
				adicionarMarker: function(latlng, icone, myMap) {
					var marker = new google.maps.Marker({
						map: myMap,
						animation: google.maps.Animation.DROP,
						icon: icone,
						position: latlng
					});
					
					return marker;
				},
				
				adicionarInformacaoMarker: function(info, myMap) {
					var infoWindow = new google.maps.InfoWindow({
						content: info
					});
					 
					google.maps.event.addListener(marker, 'click', function () {
					    infoWindow.open(myMap, marker);
					});
				}
	}
})

.factory('VagaService', function($ionicPopup, $ionicActionSheet, $q, $ionicTabsDelegate, Restangular, LOCAL_TOKEN_KEY){
	return {
	
		estacionar: function(lat, lng){
			$ionicActionSheet.show({
				   titleText: 'Tipo de vaga',
				   cancelText: 'Cancelar',
				   cancel: function(){
						$ionicTabsDelegate.select(0);
				   },
				   buttonClicked: function(index){
						$ionicTabsDelegate.select(0);
						Restangular.all("vagas").customPOST({latitude: lat, longitude: lng, tipoVaga: index}, 'estacionar', {}, {}).then(function(resp){
							$ionicPopup.alert({
								title: 'Registramos que você estacionou nesta vaga :)',
								template: 'Muito Obrigado pela sua contribuição. Você tem ' + resp.pontos + ' pontos agora :)'
							});
						}, function error(err) {
								$ionicPopup.alert({
									title: 'Erro',
									template: 'Não conseguimos registrar sua contribuição :('
								});
						});
						
						return true;
				   },
				   buttons: [ { text: 'Vaga livre'}, { text: 'Faixa azul' }, { text: 'Faixa vermelha' }, { text: 'Pisca alerta ligado' }, { text: 'Idoso/Deficiente'} ]
			});
		},
		
		liberarVaga: function(lat, lng) {
			$ionicTabsDelegate.select(0);
			Restangular.all("vagas").customPOST({latitude: lat, longitude: lng}, 'liberarVaga', {}).then(function(resp){
					$ionicPopup.alert({
						title: 'Registramos que você liberou esta vaga :)',
						template: 'Muito Obrigado pela sua contribuição. Você tem ' + resp.pontos + ' pontos agora :)'
					});
				}, function error(err) {
						$ionicPopup.alert({
							title: 'Erro',
							template: 'Não conseguimos registrar sua contribuição :('
						});
				}
			);
		},

		buscarVagas: function(params){
			return $q(function(resolve, reject) {
				Restangular.all('vagas').getList({params: params}).then(function(resp){
					resolve(resp);
				}, 
				function error(err) {
					reject('Erro ao buscar as vagas');
				});  
			});
		}
	}
});