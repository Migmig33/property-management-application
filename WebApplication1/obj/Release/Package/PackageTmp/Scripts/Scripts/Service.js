app.service('service', function ($http) {

    //Login Service
    this.authService = function (data) {
        var response = $http({
            url: "/Auth/Login",
            method: "post",
            data: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    this.verifyCodeService = function (code) {
        var response = $http({
            url: "/Auth/VerifyCode",
            method: "post",
            data: JSON.stringify({ code: code }),
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    //AI SERVice
    this.sendMessageAIService = function (mes, convo) {
        var response = $http({
            url: "/AI/Chat",
            method: "post",
            data: {
                message: mes,
                conversationHistory: convo
            },
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    this.sendMessageAsGuestService = function (mes, convo) {
        var response = $http({
            url: "/AI/GuestChat",
            method: "post",
            data: {
                message: mes,
                conversationHistory: convo
            },
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    //Save service
    this.saveUnitService = function (data, images, amenityIds, id) {
        return $http({
            url: "/System/SaveUnit",
            method: "post",
            data: {
                data: data,
                imageUrls: images,
                amenityIds: amenityIds, // ✅
                id: id
            },
            headers: { "Content-Type": "application/json" }
        });
    };
    this.UploadUnitVideoService = function (file) {
        var fd = new FormData();
        fd.append('file', file);

        return $http({
            url: '/System/UploadUnitVideo',
            method: 'POST',
            data: fd,
            headers: { 'Content-Type': undefined },   // let the browser set the boundary
            transformRequest: angular.identity
        });
    };

    this.saveTenantService = function (tenantData, coOccupants, idFiles, id) {
        var response = $http({
            url: "/System/SaveTenant",
            method: "post",
            data: {
                tenantData: tenantData,
                coOccupants: coOccupants,
                idFiles: idFiles,
                id: id
            },
            headers: { "Content-Type": "application/json" }
        });
        return response;
    };
    this.DeclineBookingService = function (id, reason) {
        return $http({
            method: 'post',
            url: '/System/DeclineBooking',
            data: {
                id: id,
                reason: reason
            }
        });
    };
    this.ConfirmBookingService = function (id) {
        return $http({
            method: 'post',
            url: '/System/ConfirmBooking',
            data: {
                id: id
            }
        });
    };
    this.ToggleBusyDateService = function (dateStr) {
        return $http({
            method: 'POST',
            url: '/System/ToggleBusyDate',
            data: {
                dateStr: dateStr
            }
        });
    };
    this.SaveMaintenanceRequestService = function (requestData, id) {
        return $http({
            method: 'post',
            url: '/System/SaveMaintenanceRequest',
            data: {
                requestData: requestData,
                id: id
            },
            headers: { "Content-Type": "application/json" }
        })
    }
    this.RemoveBusyDateService = function (dateStr) {
        var response = $http({
            method: 'POST',
            url: '/System/RemoveBusyDate',
            data: {
                dateStr: dateStr
            }
        });
        return response;

    };
    this.MarkPaymentsPaidService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/MarkPaymentsPaid',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }
    this.GetManagersService = function () {
        return $http({
            method: 'get',
            url: '/System/GetManagers'
        });
    }

    this.CreateManagerService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/CreateManager',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }

    this.UpdateManagerService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/UpdateManager',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }

    this.DeleteManagerService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/DeleteManager',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }
    this.GetLookupsService = function () {
        return $http({
            method: 'get',
            url: '/System/GetLookups'
        });
    }

    this.AddLookupItemService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/AddLookupItem',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }

    this.RemoveLookupItemService = function (payload) {
        return $http({
            method: 'post',
            url: '/System/RemoveLookupItem',
            data: payload,
            headers: { "Content-Type": "application/json" }
        });
    }
    //Get service
    this.GetDashboardDataService = function () {
        return $http.get('/System/GetDashboardData');
    }
    this.GetAdminDashboardService = function () {
        return $http.get('/System/GetDashboardDataAdmin'); 
    }
    this.GetAllUnitService = function () {
        return $http.get('/System/GetAllUnit');
    }
    this.GetAllTenantService = function () {
        return $http.get('/System/GetAllTenant');
    }
    this.GetAllBookingsService = function () {
        return $http.get('/System/GetAllBooking')
    }
    this.GetAllMaintenanceService = function () {
        return $http.get('/System/GetAllMaintenance')
    }
    this.getAllPaymentService = function () {
        return $http.get('/System/GetAllPayment')
    }
    this.GetAuditLogsService = function () {
        return $http.get('/System/GetAuditLogs');
    }
    this.GetUnitImagesService = function (uid) {
        return $http({
            method: 'GET',
            url: '/System/GetUnitImages',
            params: { uid: uid }
        });
    };


    //Delete Service
    this.DeleteUnitService = function (id) {
        var response = $http({
            url: "/System/DeleteUnit",
            method: "post",
            data: JSON.stringify({ Uid: id }),
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    this.DeleteTenantService = function (id) {
        var response = $http({
            url: "/System/DeleteTenant",
            method: "post",
            data: JSON.stringify({ Tid: id }),
            headers: { "Content-Type": "application/json" }
        })
        return response;
    }
    // Add these to your service factory, alongside GetAllUnitService.

    this.GetBrowseUnitsService = function () {
        return $http({
            method: 'GET',
            url: '/System/GetBrowseUnits'
        });
    };

    this.SetSelectedUnitService = function (id) {
        return $http({
            method: 'POST',
            url: '/System/SetSelectedUnit',
            params: { id: id }
        });
    };

    this.GetUnitDetailService = function () {
        return $http({
            method: 'GET',
            url: '/System/GetUnitDetail'
        });
    };


    this.GetVisitorSessionService = function () {
        return $http({
            method: 'GET',
            url: '/Auth/GetVisitorSession'
        });
    };

    this.SendVisitorOtpService = function (data) {
        return $http({
            method: 'POST',
            url: '/Auth/SendVisitorOtp',
            data: data
        });
    };

    this.VerifyVisitorOtpService = function (code) {
        return $http({
            method: 'POST',
            url: '/Auth/VerifyVisitorOtp',
            params: { code: code }
        });
    };

    this.ClearVisitorSessionService = function () {
        return $http({
            method: 'POST',
            url: '/Auth/ClearVisitorSession'
        });
    };

    this.GetBookingAvailabilityService = function () {
        return $http({
            method: 'GET',
            url: '/Auth/GetBookingAvailability'
        });
    };

    this.SubmitVisitorBookingService = function (data) {
        return $http({
            method: 'POST',
            url: '/Auth/SubmitVisitorBooking',
            data: data
        });
    };

    this.GetMyBookingsService = function () {
        return $http({
            method: 'GET',
            url: '/System/GetMyBookings'
        });
    };

    this.CancelMyBookingService = function (id, reason) {
        return $http({
            method: 'POST',
            url: '/System/CancelMyBooking',
            params: { id: id, reason: reason }
        });
    };
    //sms
    this.RunSmsNotificationsService = function (dryRun) {
        return $http({
            method: 'POST',
            url: '/System/RunSmsNotifications',
            params: { dryRun: dryRun }
        });
    };

    this.GetSmsLogsService = function () {
        return $http({
            method: 'GET',
            url: '/System/GetSmsLogs'
        });
    };

    this.sendResetCodeService = function (email) {
        return $http({
            url: "/Auth/SendResetCode",
            method: "post",
            params: { email: email }
        });
    };

    this.verifyResetCodeService = function (code) {
        return $http({
            url: "/Auth/VerifyResetCode",
            method: "post",
            params: { code: code }
        });
    };

    this.resetPasswordService = function (newPassword) {
        return $http({
            url: "/Auth/ResetPassword",
            method: "post",
            params: { newPassword: newPassword }
        });
    };



});