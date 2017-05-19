app.controller('NavbarController', ['$scope', '$rootScope', '$localStorage', '$location', 'toastr', function($scope, $rootScope, $localStorage, $location, toastr) {
    $scope.isCollapsed = true;

    $scope.logout = function() {
        $localStorage.jwt = undefined;
        $location.path('/');
        $rootScope.loggedIn = false;
        toastr.success("Salida del sistema exitosa");
    }
}]);
