app.controller('NavbarController', ['$scope', '$rootScope', '$localStorage', '$state', 'toastr', function($scope, $rootScope, $localStorage, $state, toastr) {
    $scope.isNavCollapsed = true;

    $scope.logout = function() {
        $localStorage.jwt = undefined;
        $state.go('main.login');
        $rootScope.loggedIn = false;
        toastr.success("Salida del sistema exitosa");
    }
}]);
