app.controller('LoginController', ['$scope', '$rootScope', '$http', '$location', '$localStorage', 'toastr', 'bsLoadingOverlayService', 'vcRecaptchaService', function($scope, $rootScope, $http, $location, $localStorage, toastr, bsLoadingOverlayService, vcRecaptchaService) {    
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
        bsLoadingOverlayService.start({ referenceId: 'login' });

        $http.post('/api/login', $scope.formData)
            .then(function(res) { 
            bsLoadingOverlayService.stop({ referenceId: 'login' });

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
            bsLoadingOverlayService.stop({ referenceId: 'login' });
            vcRecaptchaService.reload($scope.widgetId);
        });
    }
}]);
