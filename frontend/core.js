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
