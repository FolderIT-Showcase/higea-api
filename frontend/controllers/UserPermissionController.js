app.controller('UserPermissionsController', ['$scope', '$filter', '$http', 'DTOptionsBuilder', 'DTColumnDefBuilder', '$uibModal', 'lodash', 'moment', 'toastr', 'bsLoadingOverlayService', function($scope, $filter, $http, DTOptionsBuilder, DTColumnDefBuilder, $uibModal, _, moment, toastr, bsLoadingOverlayService) {
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
            bsLoadingOverlayService.start({ referenceId: 'permissions' });

            $http.post('/api/admin/newPermit', $scope.permit)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });

                if (res.data.result) {
                    $scope.permit = res.data.data;
                    $scope.permissions.push($scope.permit);
                    toastr.success("Permiso agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });
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
            bsLoadingOverlayService.start({ referenceId: 'permissions' });

            $http.post('/api/admin/editPermit', $scope.permit)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });

                if (res.data.result) {
                    $scope.permit = res.data.data;
                    var i = _.findIndex($scope.permissions, { _id: $scope.permit._id });
                    if(i >= 0) $scope.permissions[i] = angular.copy($scope.permit);
                    toastr.success("Permiso editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });
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
            bsLoadingOverlayService.start({ referenceId: 'permissions' });

            $http.post('/api/admin/removePermit', permit)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });

                if (res.data.result) {
                    var permit = res.data.data;
                    var i = _.findIndex($scope.permissions, { _id: permit._id });
                    if(i >= 0) $scope.permissions.splice(i,1);
                    toastr.success("Permiso removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'permissions' });
            });
        }, function () {
            //
        });
    }

    $scope.getPermissions = function(user) {
        bsLoadingOverlayService.start({ referenceId: 'permissions' });

        $http.get('/api/admin/permissions/' + user.username)
            .then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'permissions' });

            if(res.data.result) {
                $scope.permissions = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }, function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'permissions' });
        });
    };

    $scope.getPermissions($scope.user);
}]);
