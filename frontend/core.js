var app = angular.module('higea-api', [
    'ngRoute',
    'ngStorage',
    'ngAnimate',
    'ngLodash',
    'ngSanitize',
    'angularMoment',
    'toastr',
    'vcRecaptcha',
    'angular-jwt',
    'bsLoadingOverlay',
    'ui.bootstrap',
    'datatables',
    'datatables.bootstrap',
    'datatables.buttons'
]);

app.service('TEXT_ERRORS', [function() {
    this.ERR_API_CONNECTION = "Error de conexión a la API";
}]);

app.run(['$rootScope', '$http', '$localStorage', 'jwtHelper', '$location', 'bsLoadingOverlayService', function($rootScope, $http, $localStorage, jwtHelper, $location, bsLoadingOverlayService) {
    bsLoadingOverlayService.setGlobalConfig({
        templateUrl: '/templates/loading-overlay-template.html'
    });

    if ($localStorage.jwt) {
        $rootScope.loggedIn = true;
        $http.defaults.headers.common.Authorization = $localStorage.jwt;
    } else {
        $rootScope.loggedIn = false;
    }
}]);

app.factory('httpAbortInterceptor', ['$q', '$location', '$localStorage', 'jwtHelper', '$injector', '$rootScope', 'TEXT_ERRORS', function ($q, $location, $localStorage, jwtHelper, $injector, $rootScope, TEXT_ERRORS) {
    var canceller = $q.defer();

    return {
        request: function (config) {
            var toastr = $injector.get('toastr');

            if (config.url.match('api/') && !config.url.match('api/login') && (!$localStorage.jwt || jwtHelper.isTokenExpired($localStorage.jwt))) {
                $localStorage.jwt = undefined;
                $rootScope.loggedIn = false;

                config.timeout = 0;
                config.aborted = true;
            }

            return config || $q.when(config);
        },
        responseError: function(rejection) {
            var toastr = $injector.get('toastr');

            if (rejection.aborted) {
                toastr.warning("Su sesión ha expirado. Por favor, reingrese al sistema.");
                canceller.resolve('Session Expired');
                $location.path('/');
            } else if (rejection.status === 400) {
                toastr.warning("Solicitud inválida.");
                canceller.resolve('Bad Request');
            } else if (rejection.status === 401) {
                toastr.warning("Su sesión es inválida o ha expirado. Por favor, reingrese al sistema.");
                canceller.resolve('Unauthorized');
                $location.path('/');
            } else if (rejection.status === 403) {
                toastr.warning("Su usuario no tiene permisos para realizar la operación.");
                canceller.resolve('Forbidden');
            } else {
                let err = TEXT_ERRORS.ERR_API_CONNECTION;
                
                if (rejection.data && rejection.data.err) {
                    err = rejection.data.err;
                }
                
                if (rejection.data && typeof(rejection.data) === "string") {
                    err = rejection.data;
                }
                
                toastr.error(err);
            }
            return $q.reject(rejection);
        }
    };
}]);

app.config(function ($provide, $httpProvider) {
    $httpProvider.interceptors.push('httpAbortInterceptor');
});

app.controller('MainController', ['$scope', function($scope) {    

}]);

app.controller('NavbarController', ['$scope', '$rootScope', '$localStorage', '$location', 'toastr', function($scope, $rootScope, $localStorage, $location, toastr) {
    $scope.isCollapsed = true;

    $scope.logout = function() {
        $localStorage.jwt = undefined;
        $location.path('/');
        $rootScope.loggedIn = false;
        toastr.success("Salida del sistema exitosa");
    }
}]);

app.controller('ReportingController', ['$scope', function($scope) {

}]);

app.controller('DashboardController', ['$scope', '$filter', '$http', 'DTOptionsBuilder', 'DTColumnDefBuilder', '$uibModal', 'lodash', 'moment', 'toastr', '$loading', function($scope, $filter, $http, DTOptionsBuilder, DTColumnDefBuilder, $uibModal, _, moment, toastr, $loading) {
    $scope.clients = [];
    $scope.users = [];
    $scope.client = {};
    $scope.queryReload = function() {};

    $scope.vmC = {
        dtOptions: DTOptionsBuilder.newOptions()
        .withPaginationType('full_numbers')
        .withBootstrap()
        .withDOM('lfrBtip')
        .withButtons([{
            text: "Recargar",
            action: function() {
                $scope.getClients();
            }
        }, {
            text: "Nuevo",
            action: function() {
                $scope.newClient();
            }
        }, {
            extend: 'csvHtml5',
            exportOptions: {
                columns: 'thead th:not(.not-sortable)'
            },
            title: 'clientes_' + moment().format("YYYYMMDD_HH-mm-ss")
        }]),
        dtColumnDefs: [
            DTColumnDefBuilder.newColumnDef('not-sortable').notSortable()
        ]
    };

    $scope.vmU = {
        dtOptions: DTOptionsBuilder.newOptions()
        .withPaginationType('full_numbers')
        .withBootstrap()
        .withDOM('lfrBtip')
        .withButtons([{
            text: "Recargar",
            action: function() {
                $scope.getUsers();
            }
        }, {
            text: "Nuevo",
            action: function() {
                $scope.newUser();
            }
        }, {
            extend: 'csvHtml5',
            exportOptions: {
                columns: 'thead th:not(.not-sortable)'
            },
            title: 'usuarios_' + moment().format("YYYYMMDD_HH-mm-ss")
        }]),
        dtColumnDefs: [
            DTColumnDefBuilder.newColumnDef('not-sortable').notSortable()
        ]
    };

    $scope.vmQ = {
        dtOptions: DTOptionsBuilder.newOptions()
        .withPaginationType('full_numbers')
        .withBootstrap()
        .withDOM('lfrBtip')
        .withButtons([{
            text: "Recargar",
            action: function() {
                $scope.queryReload();
            }
        }, {
            extend: 'csvHtml5',
            exportOptions: {
                columns: 'thead th:not(.not-sortable)'
            },
            title: $scope.queryCsv + "_" + moment().format("YYYYMMDD_HH-mm-ss")
        }]),
        dtColumnDefs: [
            DTColumnDefBuilder.newColumnDef('not-sortable').notSortable()
        ]
    };

    $scope.getClients = function(callback) {
        $loading.start('clients');

        $http.get('/api/getClients')
            .then(function(res) {
            $loading.finish('clients');

            if(res.data.result) {
                $scope.clients = res.data.data;
            } else {
                $scope.clients = [];
                toastr.error(res.data.err);
            }

            if(callback) callback();
        }, function(res) {
            $scope.clients = [];
            $loading.finish('clients');

            if(callback) callback();
        });
    }

    $scope.getUsers = function(callback) {
        $loading.start('users');

        $http.get('/api/getUsers')
            .then(function(res) {
            $loading.finish('users');

            if(res.data.result) {
                $scope.users = res.data.data;
            } else {
                $scope.users = [];
                toastr.error(res.data.err);
            }

            if(callback) callback();
        }, function(res) {
            $scope.users = [];
            $loading.finish('users');

            if(callback) callback();
        });
    }

    var reload = function() {
        $scope.getClients(function(){
            $scope.getUsers();
        });
    }

    reload();

    $scope.newUser = function() {
        $scope.user = {};
        $scope.modalTitle = "Nuevo Usuario"

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/user.html'
        });

        modalInstance.result.then(function (newUser) {
            $scope.user = angular.copy(newUser);
            $loading.start('users');

            $http.post('/api/newUser', $scope.user)
                .then(function(res) {
                $loading.finish('users');

                if (res.data.result) {
                    $scope.user = res.data.data;
                    $scope.users.push($scope.user);
                    toastr.success("Usuario agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('users');
            });
        }, function () {
            toastr.info("Ingreso de usuario cancelado");
        });
    };

    $scope.newClient = function() {
        $scope.client = {};
        $scope.modalTitle = "Nuevo Cliente"

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/client.html'
        });

        modalInstance.result.then(function (newClient) {
            $scope.client = angular.copy(newClient);
            $loading.start('clients');

            $http.post('/api/newClient', $scope.client)
                .then(function(res) {
                $loading.finish('clients');

                if (res.data.result) {
                    $scope.client = res.data.data;
                    $scope.clients.push($scope.client);
                    toastr.success("Cliente agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('clients');
            });
        }, function () {
            toastr.info("Ingreso de cliente cancelado");
        });
    };

    $scope.cloneClient = function(client) {
        $loading.start('clients');
        $scope.client = angular.copy(client);
        $scope.client.code += "-COPY";
        $scope.client._id = undefined;

        $http.post('/api/newClient', $scope.client)
            .then(function(res) {
            $loading.finish('clients');

            if (res.data.result) {
                $scope.client = res.data.data;
                $scope.clients.push($scope.client);
                toastr.success("Cliente clonado con éxito");
            } else {
                toastr.error(res.data.err);
            }
        }, function(res) {
            $loading.finish('clients');
        });
    }

    $scope.getTable = function(client, table) {
        $scope.queryResults = {};
        $loading.start('queryResults');

        $http.get('/api/' + client.code + '/' + table).then(function(res) {
            $loading.finish('queryResults');

            if(res.data.result) {
                $scope.queryResults = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }).catch(function(res) {
            $loading.finish('queryResults');
        });
    }

    $scope.viewTable = function(client, table) {
        $scope.queryResults = {};
        $scope.table = table;
        $scope.client = client;
        $scope.modalTitle = table.charAt(0).toUpperCase() + table.slice(1) + ": " + client.code;
        $scope.queryReload = function() {
            $scope.getTable(client, table);
        };
        $scope.queryCsv = client.name + '_' + table;

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            size: 'xl',
            templateUrl: 'views/modals/queryResults.html'
        });

        modalInstance.rendered.then(function() {
            $scope.getTable(client, table);
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    }
    
    $scope.turnosProfesional = function(client) {
        $scope.client = client;
        $scope.formData = {};

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/turnosProfesional.html'
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    }
    
    $scope.getTurnosProfesional = function(profesional) {
        $scope.queryResults = {};
        $loading.start('queryResults');

        $http.get('/api/' + $scope.client.code + '/turnos?profesional_id=' + profesional).then(function(res) {
            $loading.finish('queryResults');

            if(res.data.result) {
                $scope.queryResults = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }).catch(function(res) {
            $loading.finish('queryResults');
        });
    }
    
    $scope.viewTurnosProfesional = function(formData) {        
        var profesional = formData.profesional;
        
        $scope.queryResults = {};
        $scope.modalTitle = "Turnos del Profesional: " + profesional;
        $scope.queryReload = function() {
            $scope.getTurnosProfesional(profesional);
        };
        $scope.queryCsv = $scope.client.name + '_turnos_' + profesional;

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            size: 'xl',
            templateUrl: 'views/modals/queryResults.html'
        });

        modalInstance.rendered.then(function() {
            $scope.getTurnosProfesional(profesional);
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    }

    $scope.editUser = function(user) {
        $scope.user = angular.copy(user);
        $scope.modalTitle = "Editar Usuario: " + user.name

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/user.html'
        });

        modalInstance.result.then(function (editedUser) {
            $scope.user = angular.copy(editedUser);
            $loading.start('users');

            $http.post('/api/editUser', $scope.user)
                .then(function(res) {
                $loading.finish('users');

                if (res.data.result) {
                    $scope.user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: $scope.user._id });
                    if(i >= 0) $scope.users[i] = angular.copy($scope.user);
                    toastr.success("Usuario editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('users');
            })
        }, function () {
            toastr.info("Edición de usuario cancelada");
        });
    };

    $scope.editClient = function(client) {
        $scope.client = angular.copy(client);
        $scope.modalTitle = "Editar Cliente: " + client.name

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/client.html'
        });

        modalInstance.result.then(function (editedClient) {
            $scope.client = angular.copy(editedClient);
            $loading.start('clients');

            $http.post('/api/editClient', $scope.client)
                .then(function(res) {
                $loading.finish('clients');

                if (res.data.result) {
                    $scope.client = res.data.data;
                    var i = _.findIndex($scope.clients, { _id: $scope.client._id });
                    if(i >= 0) $scope.clients[i] = angular.copy($scope.client);
                    toastr.success("Cliente editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('clients');
            })
        }, function () {
            toastr.info("Edición de cliente cancelada");
        });
    };

    $scope.resetPassword = function(user) {
        $scope.user = angular.copy(user);
        $scope.modalTitle = "Restablecer Contraseña: " + user.name

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/resetPassword.html'
        });

        modalInstance.result.then(function (editedUser) {
            $scope.user.password = editedUser.newPassword;
            $loading.start('users');

            $http.post('/api/resetPassword', $scope.user)
                .then(function(res) {
                $loading.finish('users');

                if (res.data.result) {
                    $scope.user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: $scope.user._id });
                    if(i >= 0) $scope.users[i] = angular.copy($scope.user);
                    toastr.success("Contraseña restablecida con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('users');
            });
        }, function () {
            toastr.info("Restablecimiento de contraseña cancelado");
        });
    };

    $scope.userPermissions = function(user) {
        $scope.user = angular.copy(user);
        $scope.modalTitle = "Permisos de Usuario: " + user.name

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/userPermissions.html',
            controller: 'UserPermissionsController',
            size: 'lg',
            scope: $scope
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    };

    $scope.removeClient = function(client) {
        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/confirm.html'
        });

        modalInstance.result.then(function () {
            $loading.start('clients');

            $http.post('/api/removeClient', client)
                .then(function(res) {
                $loading.finish('clients');

                if (res.data.result) {
                    var client = res.data.data;
                    var i = _.findIndex($scope.clients, { _id: client._id });
                    if(i >= 0) $scope.clients.splice(i,1);
                    toastr.success("Cliente removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('clients');
            });
        }, function () {
            //
        });
    }

    $scope.removeUser = function(user) {
        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/confirm.html'
        });

        modalInstance.result.then(function () {
            $loading.start('users');

            $http.post('/api/removeUser', user)
                .then(function(res) {
                $loading.finish('users');

                if (res.data.result) {
                    var user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: user._id });
                    if(i >= 0) $scope.users.splice(i,1);
                    toastr.success("Usuario removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('users');
            });
        }, function () {
            //
        });
    }
}]);

app.controller('UserPermissionsController', ['$scope', '$filter', '$http', 'DTOptionsBuilder', 'DTColumnDefBuilder', '$uibModal', 'lodash', 'moment', 'toastr', '$loading', function($scope, $filter, $http, DTOptionsBuilder, DTColumnDefBuilder, $uibModal, _, moment, toastr, $loading) {
    $scope.permissions = [];
    $scope.clients = angular.copy($scope.$parent.clients);
    $scope.user = angular.copy($scope.$parent.user);

    $scope.vmP = {
        dtOptions: DTOptionsBuilder.newOptions()
        .withPaginationType('full_numbers')
        .withBootstrap()
        .withDOM('lfrBtip')
        .withButtons([{
            text: "Recargar",
            action: function() {
                $scope.getPermissions($scope.user);
            }
        }, {
            text: "Nuevo",
            action: function() {
                $scope.newPermit($scope.user);
            }
        }, {
            extend: 'csvHtml5',
            exportOptions: {
                columns: 'thead th:not(.not-sortable)'
            },
            title: 'permisos_' + $scope.user.username + '_' + moment().format("YYYYMMDD_HH-mm-ss")
        }]),
        dtColumnDefs: [
            DTColumnDefBuilder.newColumnDef('not-sortable').notSortable()
        ]
    };

    $scope.formatClient = function(code) {
        for (var i=0; i < $scope.clients.length; i++) {
            if (code === $scope.clients[i].code) {
                return $scope.clients[i].name;
            }
        }
    };

    $scope.newPermit = function(user) {
        $scope.permit = {
            username: user.username,
            code: user.code,
            active: true
        };
        $scope.modalTitle = "Nuevo Permiso"

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/permit.html'
        });

        modalInstance.result.then(function (newPermit) {
            $scope.permit = angular.copy(newPermit);
            $loading.start('permissions');

            $http.post('/api/newPermit', $scope.permit)
                .then(function(res) {
                $loading.finish('permissions');

                if (res.data.result) {
                    $scope.permit = res.data.data;
                    $scope.permissions.push($scope.permit);
                    toastr.success("Permiso agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('permissions');
            });
        }, function () {
            toastr.info("Ingreso de permiso cancelado");
        });
    };

    $scope.editPermit = function(permit) {
        $scope.permit = angular.copy(permit);
        $scope.modalTitle = "Editar Permiso: " + permit.code

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/permit.html'
        });

        modalInstance.result.then(function (editedPermit) {
            $scope.permit = angular.copy(editedPermit);
            $loading.start('permissions');

            $http.post('/api/editPermit', $scope.permit)
                .then(function(res) {
                $loading.finish('permissions');

                if (res.data.result) {
                    $scope.permit = res.data.data;
                    var i = _.findIndex($scope.permissions, { _id: $scope.permit._id });
                    if(i >= 0) $scope.permissions[i] = angular.copy($scope.permit);
                    toastr.success("Permiso editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('permissions');
            })
        }, function () {
            toastr.info("Edición de permiso cancelada");
        });
    };

    $scope.removePermit = function(permit) {
        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/confirm.html'
        });

        modalInstance.result.then(function () {
            $loading.start('permissions');

            $http.post('/api/removePermit', permit)
                .then(function(res) {
                $loading.finish('permissions');

                if (res.data.result) {
                    var permit = res.data.data;
                    var i = _.findIndex($scope.permissions, { _id: permit._id });
                    if(i >= 0) $scope.permissions.splice(i,1);
                    toastr.success("Permiso removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                $loading.finish('permissions');
            });
        }, function () {
            //
        });
    }

    $scope.getPermissions = function(user) {
        $loading.start('permissions');

        $http.get('/api/permissions/' + user.username)
            .then(function(res) {
            $loading.finish('permissions');

            if(res.data.result) {
                $scope.permissions = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }, function(res) {
            $loading.finish('permissions');
        });
    };

    $scope.getPermissions($scope.user);
}]);

app.controller('LoginController', ['$scope', '$rootScope', '$http', '$location', '$localStorage', 'toastr', '$loading', 'vcRecaptchaService', function($scope, $rootScope, $http, $location, $localStorage, toastr, $loading, vcRecaptchaService) {    
    if ($localStorage.jwt) {
        $location.path('dashboard');
    }

    $scope.response = null;
    $scope.widgetId = null;
    $scope.formData = {};
    $scope.recaptcha = {
        key: "6LcRkCAUAAAAAG5eVLuSIRz6V66NKEjIpw1KeJu9"
    };

    $scope.setResponse = function (response) {
        $scope.response = response;
    };

    $scope.setWidgetId = function (widgetId) {
        $scope.widgetId = widgetId;
    };

    $scope.cbExpiration = function() {
        vcRecaptchaService.reload($scope.widgetId);
        $scope.response = null;
    };

    $scope.login = function() {
        $loading.start('login');

        $http.post('/api/login', $scope.formData)
            .then(function(res) { 
            $loading.finish('login'); 

            if(res.data.result) {
                $localStorage.jwt = res.data.token;

                $rootScope.loggedIn = true;

                $http.defaults.headers.common.Authorization = res.data.token;

                toastr.success("¡Bienvenido al nuevo sistema de administración Higea API!");
                $location.path('dashboard');
            } else {
                toastr.error(res.data.err);
                //vcRecaptchaService.reload($scope.widgetId);
            }
        }, function(res) {
            $loading.finish('login');
            vcRecaptchaService.reload($scope.widgetId);
        });
    }
}]);

app.directive("compareTo", [function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ngModel) {

            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };

            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
}]);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix('');

    $routeProvider
        .when('/', {
        templateUrl: 'views/login.html',
        controller: 'LoginController'
    })
        .when('/dashboard', {
        templateUrl: 'views/dashboard.html',
        controller: 'DashboardController'
    })
        .when('/reportes', {
        templateUrl: 'views/reportes.html',
        controller: 'ReportingController'
    })
        .otherwise({
        redirectTo: '/'
    });
}]);

app.config(['toastrConfig', function(toastrConfig) {
    angular.extend(toastrConfig, {
        allowHtml: true,
        closeButton: false,
        closeHtml: '<button>&times;</button>',
        extendedTimeOut: 1000,
        iconClasses: {
            error: 'toast-error',
            info: 'toast-info',
            success: 'toast-success',
            warning: 'toast-warning'
        },  
        messageClass: 'toast-message',
        onHidden: null,
        onShown: null,
        onTap: null,
        progressBar: true,
        tapToDismiss: true,
        templates: {
            toast: 'directives/toast/toast.html',
            progressbar: 'directives/progressbar/progressbar.html'
        },
        timeOut: 5000,
        titleClass: 'toast-title',
        toastClass: 'toast'
    });
}]);

app.filter('queryRow', function() {
    return function(cell, type) {
        switch (type) {
            case "Number":
                if (!isNaN(cell)) {
                    cell = Number(cell);
                } else {
                    cell = null;
                }
                break;

            case "String":
                if (cell !== undefined && cell !== "NULL") {
                    cell = String(cell);
                } else {
                    cell = null;
                }
                break;

            case "Date":
                var m = moment(cell);
                if (m.isValid()) {
                    cell = m.format("DD/MM/YYYY");
                } else {
                    cell = null;
                }
                break;

            case "Time":
                var m = moment(cell);
                if (m.isValid()) {
                    cell = m.format("HH:mm");
                } else {
                    cell = null;
                }
                break;
        }

        return cell;
    }
});
