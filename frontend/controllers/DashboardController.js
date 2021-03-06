app.controller('DashboardController', ['$scope', '$filter', '$http', 'DTOptionsBuilder', 'DTColumnDefBuilder', '$uibModal', 'lodash', 'moment', 'toastr', 'bsLoadingOverlayService', function($scope, $filter, $http, DTOptionsBuilder, DTColumnDefBuilder, $uibModal, _, moment, toastr, bsLoadingOverlayService) {
    $scope.clients = [];
    $scope.users = [];
    $scope.client = {};
    $scope.queryReload = function() {};

    $scope.tables = [{
        id: "profesionales",
        label: "Profesionales"
    }, {
        id: "pacientes",
        label: "Pacientes"
    }, {
        id: "turnos",
        label: "Turnos"
    }, {
        id: "especialidades",
        label: "Especialidades"
    }, {
        id: "obrasSociales",
        label: "Obras Sociales"
    }, {
        id: "planesObraSocial",
        label: "Planes de Obras Sociales"
    }, {
        id: "estadoCiviles",
        label: "Estados Civiles"
    }, {
        id: "tipoDocumentos",
        label: "Tipos de Documentos"
    }, {
        id: "paises",
        label: "Países"
    }, {
        id: "provincias",
        label: "Provincias"
    }, {
        id: "localidades",
        label: "Localidades"
    }, {
        id: "servicios",
        label: "Servicios (Motivos)"
    }, {
        id: "tipoOrigenTurno",
        label: "Tipos de Origen de Turnos"
    }, {
        id: "tipoTurnoFac",
        label: "Tipos de Turnos"
    }, {
        id: "estadoTurnos",
        label: "Estados de Turnos"
    }];

    $scope.turnosTables = [{
        table: 'profesionales',
        label: 'Profesional',
        column_id: 'profesional_id'
    }, {
        table: 'pacientes',
        label: 'Paciente',
        column_id: 'paciente_id'
    }];

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
        bsLoadingOverlayService.start({ referenceId: 'clients' });

        $http.get('/api/admin/getClients')
            .then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'clients' });

            if (res.data.result) {
                $scope.clients = res.data.data;

                if (callback) callback();
            } else {
                $scope.clients = [];
                toastr.error(res.data.err);
            }
        }, function(res) {
            $scope.clients = [];
            bsLoadingOverlayService.stop({ referenceId: 'clients' });
        });
    }

    $scope.getUsers = function(callback) {
        bsLoadingOverlayService.start({ referenceId: 'users' });

        $http.get('/api/admin/getUsers')
            .then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'users' });

            if(res.data.result) {
                $scope.users = res.data.data;

                if (callback) callback();
            } else {
                $scope.users = [];
                toastr.error(res.data.err);
            }
        }, function(res) {
            $scope.users = [];
            bsLoadingOverlayService.stop({ referenceId: 'users' });
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
            bsLoadingOverlayService.start({ referenceId: 'users' });

            $http.post('/api/admin/newUser', $scope.user)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });

                if (res.data.result) {
                    $scope.user = res.data.data;
                    $scope.users.push($scope.user);
                    toastr.success("Usuario agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });
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
            bsLoadingOverlayService.start({ referenceId: 'clients' });

            $http.post('/api/admin/newClient', $scope.client)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });

                if (res.data.result) {
                    $scope.client = res.data.data;
                    $scope.clients.push($scope.client);
                    toastr.success("Cliente agregado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });
            });
        }, function () {
            toastr.info("Ingreso de cliente cancelado");
        });
    };

    $scope.cloneClient = function(client) {
        bsLoadingOverlayService.start({ referenceId: 'clients' });
        $scope.client = angular.copy(client);
        $scope.client.code += "-COPY";
        $scope.client._id = undefined;

        $http.post('/api/admin/newClient', $scope.client)
            .then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'clients' });

            if (res.data.result) {
                $scope.client = res.data.data;
                $scope.clients.push($scope.client);
                toastr.success("Cliente clonado con éxito");
            } else {
                toastr.error(res.data.err);
            }
        }, function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'clients' });
        });
    }

    $scope.getTable = function(client, table) {
        $scope.queryResults = {};
        bsLoadingOverlayService.start({ referenceId: 'queryResults' });

        $http.get('/api/' + client.code + '/' + table).then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'queryResults' });

            if(res.data.result) {
                $scope.queryResults = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }).catch(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'queryResults' });
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
        $scope.queryCsv = $scope.client.code + '_' + table;
        $scope.vmQ.dtOptions.buttons[1].title = $scope.queryCsv + "_" + moment().format("YYYYMMDD_HH-mm-ss");

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

    $scope.turnos = function(client, table) {
        $scope.client = client;
        $scope.table = table;
        $scope.formData = {};

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            templateUrl: 'views/modals/turnos.html'
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    }

    $scope.viewTurnos = function(formData) {
        var id = formData.id;

        $scope.queryResults = {};
        $scope.modalTitle = "Turnos del " + $scope.table.label + ": " + id;
        $scope.queryReload = function() {
            $scope.getTurnos(id);
        };
        $scope.queryCsv = $scope.client.code + '_turnos_' + $scope.table.table + "_" + id;
        $scope.vmQ.dtOptions.buttons[1].title = $scope.queryCsv + "_" + moment().format("YYYYMMDD_HH-mm-ss");

        var modalInstance = $uibModal.open({
            backdrop: 'static',
            scope: $scope,
            size: 'xl',
            templateUrl: 'views/modals/queryResults.html'
        });

        modalInstance.rendered.then(function() {
            $scope.getTurnos(formData);
        });

        modalInstance.result.then(function() {
        }, function() {
        });
    }

    $scope.getTurnos = function(formData) {
        var id = formData.id;
        var fecha = formData.fecha;
        var url = '/api/' + $scope.client.code + '/turnos?' + $scope.table.column_id +  '=' + id;
        
        if (fecha && moment(fecha).isValid()) {
            url += "&turno_fecha=" + moment(fecha).format("YYYY-MM-DD");
        }
        
        $scope.queryResults = {};
        bsLoadingOverlayService.start({ referenceId: 'queryResults' });

        $http.get(url).then(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'queryResults' });

            if(res.data.result) {
                $scope.queryResults = res.data.data;
            } else {
                toastr.error(res.data.err);
            }
        }).catch(function(res) {
            bsLoadingOverlayService.stop({ referenceId: 'queryResults' });
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
            bsLoadingOverlayService.start({ referenceId: 'users' });

            $http.post('/api/admin/editUser', $scope.user)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });

                if (res.data.result) {
                    $scope.user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: $scope.user._id });
                    if(i >= 0) $scope.users[i] = angular.copy($scope.user);
                    toastr.success("Usuario editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });
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
            bsLoadingOverlayService.start({ referenceId: 'clients' });

            $http.post('/api/admin/editClient', $scope.client)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });

                if (res.data.result) {
                    $scope.client = res.data.data;
                    var i = _.findIndex($scope.clients, { _id: $scope.client._id });
                    if(i >= 0) $scope.clients[i] = angular.copy($scope.client);
                    toastr.success("Cliente editado con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });
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
            bsLoadingOverlayService.start({ referenceId: 'users' });

            $http.post('/api/admin/resetPassword', $scope.user)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });

                if (res.data.result) {
                    $scope.user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: $scope.user._id });
                    if(i >= 0) $scope.users[i] = angular.copy($scope.user);
                    toastr.success("Contraseña restablecida con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });
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
            bsLoadingOverlayService.start({ referenceId: 'clients' });

            $http.post('/api/admin/removeClient', client)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });

                if (res.data.result) {
                    var client = res.data.data;
                    var i = _.findIndex($scope.clients, { _id: client._id });
                    if(i >= 0) $scope.clients.splice(i,1);
                    toastr.success("Cliente removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'clients' });
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
            bsLoadingOverlayService.start({ referenceId: 'users' });

            $http.post('/api/admin/removeUser', user)
                .then(function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });

                if (res.data.result) {
                    var user = res.data.data;
                    var i = _.findIndex($scope.users, { _id: user._id });
                    if(i >= 0) $scope.users.splice(i,1);
                    toastr.success("Usuario removido con éxito");
                } else {
                    toastr.error(res.data.err);
                }
            }, function(res) {
                bsLoadingOverlayService.stop({ referenceId: 'users' });
            });
        }, function () {
            //
        });
    }
}]);
