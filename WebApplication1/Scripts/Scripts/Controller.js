app.controller('controller', function (service, $scope, $timeout, $interval, $http, $sce, $window) {



    // Line chart — green
    $scope.linecolors = [{
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        borderColor: '#16a34a',
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#15803d',
        pointHoverBorderColor: '#ffffff'
    }];

    // Bar chart — occupied green, vacant grey
    $scope.barcolors = [
        {
            backgroundColor: '#16a34a',
            borderColor: '#16a34a',
            hoverBackgroundColor: '#15803d'
        },
        {
            backgroundColor: '#cbd5e1',
            borderColor: '#cbd5e1',
            hoverBackgroundColor: '#94a3b8'
        }
    ];
    // ==========================================
    // GREENBOT CHAT LOGIC
    // ==========================================
    //PROPERTY MANAGER
    $scope.initChat = function () {
        $scope.chatOpen = false;
        $scope.unread = 0;
        $scope.adminSuggestions = [
            "How many units are vacant?",
            "Who has overdue payments?",
            "Show pending bookings",
            "List expiring leases"
        ];

        // Setup the initial welcome message
        $scope.clearChat();
    };

    $scope.clearChat = function () {
        $scope.chatMessages = [
            {
                id: "init",
                sender: "bot",
                text: "Hi Admin! I'm GreenBot. Ask me about your units, tenants, payments, or bookings.",
                time: new Date()
            }
        ];
    };

    $scope.initChat();


    $scope.chatHistory = [];
    $scope.userMessage = "";

    $scope.sendMessage = function (suggestion) {
        // Push user message immediately to UI
        $scope.chatMessages.push({
            sender: "user",
            text: $scope.userMessage || suggestion,
            time: new Date()
        });

        var mes = $scope.userMessage || suggestion;
        var convo = JSON.stringify($scope.chatHistory);

        $scope.userMessage = "";  // clear input early

        service.sendMessageAIService(mes, convo)
            .then(function (response) {
                if (response.data.success) {
                    // Push bot reply to UI
                    $scope.chatMessages.push({
                        sender: "bot",
                        text: response.data.reply,
                        time: new Date()
                    });
                    $scope.chatHistory = response.data.history;  // update history
                } else {
                    $scope.chatMessages.push({
                        sender: "bot",
                        text: response.data.message,
                        time: new Date()
                    });
                }
            })
            .catch(function () {
                $scope.chatMessages.push({
                    sender: "bot",
                    text: "Something went wrong. Please try again.",
                    time: new Date()
                });
            });
    };

    //Renter
    $scope.initRenterChat = function () {
        $scope.chatOpen = false;
        $scope.unread = 0;

        $scope.renterSuggestions = [
            "Studio units under ₱18,000",
            "Which units have parking?",
            "Pet-friendly units available",
            "Best unit for a student near DLSU",
            "Show me units with a balcony"
        ];

        $scope.chatMessages = [{
            id: "init",
            sender: "bot",
            text: "Hi! I'm GreenBot. Tell me your budget, unit type, or must-have amenities and I'll help you find a good match.",
            time: new Date()
        }];

        $scope.chatHistory = [];
        $scope.userMessage = "";
    };

    // ==========================================
    // 1. INITIALIZATION & DEFAULT STATE
    // ==========================================
    $scope.thisMonthhs = new Date();
    $scope.loading = false;

    // Modals & Confirmations
    $scope.editorModal = false;
    $scope.deleteUnitConfirm = false;
    $scope.deleteTenantConfirm = false;
    $scope.selectedBooking = false;
    $scope.declineTarget = null;
    $scope.confirmTarget = null;

    // Auth State
    $scope.step = 'credentials';
    $scope.resendCooldown = 0;

    // Filters & Sorting (Global)
    $scope.searchQuery = '';
    $scope.statusFilter = 'All';
    $scope.occupancyFilter = 'All';
    $scope.sortAsc = true;

    $scope.tenantSearchQuery = '';
    $scope.tenantStatusFilter = 'All';
    $scope.tenantLiveStatusFilter = 'All';
    $scope.tenantSortAsc = true;
    $scope.tenantContractFilter = 'All';

    // Unit Defaults
    $scope.beds = 'Studio';
    $scope.maxOccupants = 2;
    $scope.status = 'active';
    $scope.colorCode = '#1F6FEB';
    $scope.address = 'Green Residences, Taft Avenue, Manila';
    $scope.price = 15000;
    $scope.amenities = [];

    // File Arrays
    $scope.imageUrls = [];
    $scope.idFiles = [];
    $scope.co_occupants = [];

    // Chart Defaults
    $scope.linelabels = [];
    $scope.linedata = [[]];
    $scope.lineseries = ['Revenue'];
    $scope.barlabels = [];
    $scope.bardata = [[], []];
    $scope.barseries = ['Occupied', 'Vacant'];

    // Override the datasets to FORCE the labels
    $scope.datasetOverride = [
        { label: 'Occupied' },
        { label: 'Vacant' }
    ];
    $scope.baroptions = {
        legend: {
            display: true,
            position: 'top'
        }
    };

    // ==========================================
    // 2. UI & TOAST NOTIFICATIONS
    // ==========================================
    $scope.toast = { toastShow: false, message: '', type: 'error' };

    $scope.showToast = function (message, type) {
        $scope.toast.message = message;
        $scope.toast.type = type;
        $scope.toastShow = true;

        $timeout(function () {
            $scope.toastShow = false;
        }, 8000);
    };

    // ==========================================
    // 3. NAVIGATION
    // ==========================================
    $scope.goTo = function (page) {
        var routes = {
            'Home': '/System/Index',
            'Browse': '/System/RentersBrowse',
            'MBookings': '/System/RentersBookings',
            'Dashboard': '/System/Dashboard',
            'Units': '/System/Units',
            'Bookings': '/System/Bookings',
            'Tenants': '/System/Tenants',
            'Payments': '/System/Payments',
            'Maintenance': '/System/Maintenance',
            'Logout': '/System/Auth',
            'TenantPortal': '/System/TenantPortal'
        };
        if (routes[page]) window.location.href = routes[page];
    };

    // ==========================================
    // 4. AUTHENTICATION
    // ==========================================
    function startCooldown() {
        $scope.resendCooldown = 30;
        var cooldownTimer = $interval(function () {
            $scope.resendCooldown--;
            if ($scope.resendCooldown <= 0) $interval.cancel(cooldownTimer);
        }, 1000);
    }

    $scope.authFunc = function () {
        if (!$scope.email || !$scope.password) {
            return $scope.showToast("Please fill out email and password", "error");
        }
        $scope.loading = true;
        var authData = { email: $scope.email, password: $scope.password };
        service.authService(authData).then(function (response) {
            if (response.data.success) {
                $scope.userRole = response.data.role; // Store role from backend
                $scope.step = 'verify';
                $scope.otp = [];
                startCooldown();
                $scope.showToast(response.data.message, "success");
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }).finally(function () { $scope.loading = false; });
    };

    $scope.otpNext = function (index) {
        var val = $scope.otp[index];
        if (!/^\d?$/.test(val)) { $scope.otp[index] = ''; return; }
        if (val && index < 5) {
            document.getElementById('otp' + (index + 1)).focus();
        }
    };


    $scope.verifyCode = function () {
        var code = $scope.otp.join('');
        if (code.length < 6) {
            return $scope.showToast("Please enter a full 6-digit code", "error");
        }
        $scope.loading = true;
        service.verifyCodeService(code).then(function (response) {
            if (response.data.success) {
                if ($scope.userRole === 1) {
                    $scope.showToast("Welcome Back, Admin!", "success");
                    $scope.goTo('Dashboard');
                } else if ($scope.userRole === 2) {
                    $scope.showToast("Welcome Back, Tenant!", "success");
                    $scope.goTo('TenantPortal');
                } else {
                    $scope.showToast("Unknown role. Access denied.", "error");
                }
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }).finally(function () { $scope.loading = false; });
    };
    $scope.resend = function () {
        if ($scope.resendCooldown > 0) return;
        $scope.otp = [];
        $scope.authFunc();
    };

    // ==========================================
    // 5. DASHBOARD & DATA FETCHING
    // ==========================================
    $scope.getDataNum = function () {
        service.GetDashboardDataService().then(function (response) {
            var res = response.data;
            console.log("Dashboard C# Data:", res);

            $scope.activeUnitNum = res.activeUnitNum || [];
            $scope.pendingRequestNum = res.pendingRequestNum || [];
            $scope.pendingBookNum = res.pendingBookNum || [];
            $scope.totalPayment = res.totalPayment || 0;
            $scope.recentBookings = res.recentBookings || [];
            $scope.totalVacant = res.currentVacantUnits || 0;

            const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            if (res.monthlyRevenue && res.monthlyRevenue.length > 0) {
                $scope.linelabels = res.monthlyRevenue.map(x => monthNames[x.Month]);
                $scope.linedata = [res.monthlyRevenue.map(x => x.Revenue)];
                $scope.lineseries = ['Revenue'];
            }

            if (res.monthlyOccupant && res.monthlyOccupant.length > 0) {
                $scope.barlabels = res.monthlyOccupant.map(x => monthNames[x.Month]);
                $scope.bardata = [
                    res.monthlyOccupant.map(x => x.OccupiedUnits),
                    res.monthlyOccupant.map(x => x.VacantUnits)
                ];
                $scope.barseries = ['Occupied Units', 'Vacant Units'];
            }
        });
    };

    // Amenities
    $scope.amenityOptions = [];

    $scope.selectedAmenities = function () {
        if (!$scope.amenityOptions) return [];
        return $scope.amenityOptions.filter(function (a) {
            return a.selected === true;
        });
    };

    function loadAllAmenities() {
        $http.get('/System/GetAllAmenities').then(function (response) {
            if (response.data.success) {
                $scope.amenityOptions = response.data.data.map(function (amenity) {
                    return {
                        id: amenity.id,
                        name: amenity.name,
                        selected: false
                    };
                });
            }
        });
    }
    loadAllAmenities();

    // ==========================================
    // 6. UNIT MANAGEMENT (CRUD & Filters)
    // ==========================================
    $scope.getAllUnits = function () {
        service.GetAllUnitService().then(function (response) {
            $scope.units = response.data.data;
            $scope.totalUnits = $scope.units.length;
        });
    };

    $scope.filteredUnits = function () {
        var list = $scope.units || [];

        if ($scope.searchQuery) {
            var q = $scope.searchQuery.toLowerCase();
            list = list.filter(u =>
                u.unitName.toLowerCase().includes(q) ||
                u.floor.toLowerCase().includes(q) ||
                u.beds.toLowerCase().includes(q)
            );
        }
        if ($scope.statusFilter !== "All") {
            list = list.filter(u => u.status.toLowerCase() === $scope.statusFilter.toLowerCase());
        }
        if ($scope.occupancyFilter !== "All") {
            list = list.filter(u => u.occupancy === $scope.occupancyFilter);
        }

        list = list.sort((a, b) => $scope.sortAsc ? a.unitName.localeCompare(b.unitName) : b.unitName.localeCompare(a.unitName));
        $scope.totalUnits = list.length;
        return list;
    };

    $scope.toggleSort = function () { $scope.sortAsc = !$scope.sortAsc; };
    $scope.setStatus = function (val) { $scope.statusFilter = val; };
    $scope.setOccupancy = function (val) { $scope.occupancyFilter = val; };

    $scope.triggerEditUnit = function (unit) {
        $scope.editorModal = true;
        $scope.unitName = unit.unitName;
        $scope.price = unit.price;
        $scope.beds = unit.beds;
        $scope.sqm = unit.sqm;
        $scope.floor = unit.floor;
        $scope.description = unit.description;
        $scope.videoUrl = unit.videoUrl;
        $scope.colorCode = unit.colorCode;
        $scope.status = unit.status;
        $scope.address = unit.address;
        $scope.maxOccupants = unit.maxOccupants;
        $scope.imageUrls = [];

        service.GetUnitImagesService(unit.Uid).then(function (response) {
            if (response.data.success) {
                $scope.imageUrls = response.data.data || [];
            }
        });
        $scope.selectedUnit = unit.Uid;

        if ($scope.amenityOptions) {
            $scope.amenityOptions.forEach(function (opt) {
                var hasAmenity = unit.amenities && unit.amenities.some(function (ua) { return ua.id === opt.id; });
                opt.selected = hasAmenity;
            });
        }
    };

    $scope.closeEditorModal = function () {
        $scope.editorModal = false;

        $scope.unitName = "";
        $scope.price = "";
        $scope.beds = "";
        $scope.sqm = "";
        $scope.floor = "";
        $scope.description = "";
        $scope.videoUrl = "";
        $scope.colorCode = "";
        $scope.status = "";
        $scope.address = "";
        $scope.maxOccupants = "";
        $scope.imageUrls = [];
        $scope.selectedUnit = null;

        if ($scope.amenityOptions) {
            $scope.amenityOptions.forEach(function (opt) {
                opt.selected = false;
            });
        }
    };

    $scope.saveUnit = function (id) {
        var unitData = {
            unitName: $scope.unitName, price: $scope.price, beds: $scope.beds,
            sqm: $scope.sqm, floor: $scope.floor, description: $scope.description,
            videoUrl: $scope.videoUrl, colorCode: $scope.colorCode, status: $scope.status,
            address: $scope.address, maxOccupants: $scope.maxOccupants
        };

        if (!$scope.unitName) return $scope.showToast("Unit Name is required", "error");
        if (!$scope.price || $scope.price <= 0) return $scope.showToast("Price must be greater than 0", "error");
        if (!$scope.floor) return $scope.showToast("Floor is required", "error");
        if (!$scope.sqm || $scope.sqm <= 0) return $scope.showToast("Size (sqm) must be greater than 0", "error");
        if (!$scope.maxOccupants || $scope.maxOccupants < 1 || $scope.maxOccupants > 20) return $scope.showToast("Max Occupants must be between 1 and 20", "error");

        var amenityIds = $scope.selectedAmenities().map(function (a) {
            return a.id || a.Id || a.amenityId;
        }).join(',');

        service.saveUnitService(unitData, $scope.imageUrls, amenityIds, id).then(function (response) {
            if (response.data.success) {
                $scope.showToast(response.data.message, "success");
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }).finally(function () {
            $scope.getAllUnits();
            $scope.closeEditorModal();
        });
    };

    $scope.triggerConfirmDeleteUnit = function (id) {
        $scope.selectedUnit = id;
        $scope.deleteUnitConfirm = true;
    };

    $scope.deleteUnit = function (id) {
        service.DeleteUnitService(id).then(function (response) {
            $scope.showToast(response.data.message, response.data.success ? "success" : "error");
        }).finally(function () {
            $scope.deleteUnitConfirm = false;
            $scope.getAllUnits();
        });
    };

    // ==========================================
    // 7. TENANT MANAGEMENT (CRUD & Filters)
    // ==========================================
    $scope.getAllTenants = function () {
        service.GetAllTenantService().then(function (response) {
            $scope.tenants = response.data.data;
            $scope.totalTenants = $scope.tenants.length;
        });
    };

    $scope.onUnitChange = function () {
        if (!$scope.unitId) {
            $scope.maxCoOccupantsLimit = 0;
            return;
        }

        var selectedUnit = $scope.units.find(function (u) {
            return u.Uid === $scope.unitId;
        });

        if (selectedUnit && selectedUnit.maxOccupants > 0) {
            $scope.maxCoOccupantsLimit = selectedUnit.maxOccupants - 1;
            if ($scope.co_occupants && $scope.co_occupants.length > $scope.maxCoOccupantsLimit) {
                $scope.co_occupants = $scope.co_occupants.slice(0, $scope.maxCoOccupantsLimit);
                $scope.showToast("Co-occupants adjusted to fit the new unit's capacity.", "info");
            }
        } else {
            $scope.maxCoOccupantsLimit = 0;
        }
    };

    $scope.triggerAddTenant = function () {
        $scope.editingTenant = null;
        $scope.selectedTenant = null;
        $scope.tenantNumber = '';
        $scope.occupancyTypeId = 1;
        $scope.passwordHash = '123';
        $scope.name = '';
        $scope.email = '';
        $scope.phone = '';
        $scope.unitId = '';
        $scope.address = '';
        $scope.occupation = '';
        $scope.leaseStart = null;
        $scope.leaseEnd = null;
        $scope.minLeaseEnd = null;
        $scope.maxCoOccupantsLimit = 0;
        $scope.co_occupants = [];
        $scope.idFiles = [];
        $scope.deletedCoOccupants = [];
        $scope.editorModal = true;
    };

    $scope.filteredTenants = function () {
        var list = $scope.tenants || [];

        if ($scope.tenantSearchQuery) {
            var q = $scope.tenantSearchQuery.toLowerCase();
            list = list.filter(t =>
                (t.name && t.name.toLowerCase().includes(q)) ||
                (t.email && t.email.toLowerCase().includes(q)) ||
                (t.unit && t.unit.toLowerCase().includes(q)) ||
                (t.tenantNumber && t.tenantNumber.toLowerCase().includes(q))
            );
        }
        if ($scope.tenantStatusFilter !== 'All') {
            list = list.filter(t => t.status && t.status.toLowerCase() === $scope.tenantStatusFilter.toLowerCase());
        }
        if ($scope.tenantLiveStatusFilter !== 'All') {
            list = list.filter(t => t.liveStatus === $scope.tenantLiveStatusFilter);
        }
        if ($scope.tenantContractFilter !== 'All') {
            list = list.filter(function (t) {
                return t.contractType === $scope.tenantContractFilter;
            });
        }

        list = list.slice().sort((a, b) => $scope.tenantSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        $scope.totalTenants = list.length;
        return list;
    };

    $scope.toggleTenantSort = function () { $scope.tenantSortAsc = !$scope.tenantSortAsc; };
    $scope.setTenantStatus = function (val) { $scope.tenantStatusFilter = val; };
    $scope.setTenantLiveStatus = function (val) { $scope.tenantLiveStatusFilter = val; };
    $scope.setTenantContract = function (val) {
        $scope.tenantContractFilter = val;
    };

    $scope.updateMinLeaseEnd = function () {
        if ($scope.leaseStart) {
            var minDate = new Date($scope.leaseStart);
            minDate.setMonth(minDate.getMonth() + 3);
            var year = minDate.getFullYear();
            var month = String(minDate.getMonth() + 1).padStart(2, '0');
            var day = String(minDate.getDate()).padStart(2, '0');

            $scope.minLeaseEnd = year + '-' + month + '-' + day;

            if ($scope.leaseEnd && new Date($scope.leaseEnd) < minDate) {
                $scope.leaseEnd = null;
                $scope.showToast("Lease End cleared: Minimum contract is 3 months.", "info");
            }
        } else {
            $scope.minLeaseEnd = null;
        }
    };

    $scope.triggerEditTenant = function (tenant) {
        $scope.editorModal = true;
        $scope.editingTenant = tenant;
        $scope.selectedTenant = tenant.Tid;

        $scope.occupancyTypeId = tenant.occupancyTypeId;
        $scope.tenantNumber = tenant.tenantNumber;
        $scope.name = tenant.name;
        $scope.email = tenant.email;
        $scope.phone = tenant.phone;
        $scope.unitId = tenant.unitId;
        $scope.address = tenant.address;
        $scope.occupation = tenant.occupation;
        $scope.passwordHash = tenant.passwordHash;
        $scope.occupancyType = tenant.occupancyType;
        $scope.deletedCoOccupants = [];

        if (tenant.leaseStart) $scope.leaseStart = new Date(tenant.leaseStart);
        if (tenant.leaseEnd) $scope.leaseEnd = new Date(tenant.leaseEnd);

        $scope.updateMinLeaseEnd();

        $scope.maxCoOccupantsLimit = (tenant.maxOccupants && tenant.maxOccupants > 0) ? (tenant.maxOccupants - 1) : 0;
        $scope.co_occupants = tenant.coOccupants ? angular.copy(tenant.coOccupants) : [];
        if (tenant.idFiles && tenant.idFiles.length > 0) {
            $scope.idFiles = tenant.idFiles.map(function (file) {
                return {
                    id: file.id,
                    url: file.url
                };
            });
        } else {
            $scope.idFiles = [];
        }
    };

    $scope.addCoOccupant = function () {
        if (!$scope.co_occupants) $scope.co_occupants = [];

        if ($scope.co_occupants.length < $scope.maxCoOccupantsLimit) {
            $scope.co_occupants.push({ name: '', phone: '', address: '' });
            setTimeout(function () {
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 50);
        }
    };

    $scope.removeCoOccupant = function (index) {
        var removedItem = $scope.co_occupants[index];
        if (removedItem.id) {
            $scope.deletedCoOccupants.push(removedItem.id);
        }
        $scope.co_occupants.splice(index, 1);
    };

    $scope.shouldShowUnit = function (unit) {
        if ($scope.editingTenant && $scope.editingTenant.unitId === unit.Uid) {
            return true;
        }

        var isOccupied = false;
        if ($scope.tenants) {
            isOccupied = $scope.tenants.some(function (t) {
                return t.unitId === unit.Uid && t.liveStatus !== 'Terminated';
            });
        }
        return !isOccupied;
    };

    $scope.getDaysLeftClass = function (days) {
        if (days < 0) return 'bg-red-50 text-red-700 border-red-100';
        if (days <= 30) return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-blue-50 text-blue-700 border-blue-100';
    };

    $scope.getContractClass = function (type) {
        if (type === 'Short-term') return 'bg-purple-50 text-purple-700 border-purple-100';
        if (type === 'Mid-term') return 'bg-blue-50 text-blue-700 border-blue-100';
        if (type === 'Long-term') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        return 'bg-slate-50 text-slate-500 border-slate-200';
    };

    $scope.getStatusClass = function (status) {
        if (status === 'Active') return 'bg-emerald-100 text-emerald-700';
        if (status === 'Expiring') return 'bg-amber-100 text-amber-700';
        if (status === 'Expired') return 'bg-red-100 text-red-700';
        if (status === 'Terminated') return 'bg-slate-200 text-slate-700';
        return 'bg-slate-100 text-slate-500';
    };

    $scope.getPaymentClass = function (status) {
        if (status === 'Paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (status === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-100';
        if (status === 'Overdue') return 'bg-red-50 text-red-700 border-red-100';
        return 'bg-slate-50 text-slate-500 border-slate-200';
    };

    $scope.saveTenant = function (id) {
        var formatToDateString = function (dateObj) {
            if (!dateObj) return null;
            var d = new Date(dateObj);
            var year = d.getFullYear();
            var month = String(d.getMonth() + 1).padStart(2, '0');
            var day = String(d.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        };

        var tenantData = {
            name: $scope.name,
            email: $scope.email,
            phone: $scope.phone,
            unitId: $scope.unitId,
            leaseStart: formatToDateString($scope.leaseStart),
            leaseEnd: formatToDateString($scope.leaseEnd),
            address: $scope.address,
            occupation: $scope.occupation,
            passwordHash: $scope.passwordHash,
            occupancyTypeId: $scope.occupancyTypeId,
            deletedCoOccupants: $scope.deletedCoOccupants
        };

        if (!$scope.name) return $scope.showToast("Full Name is required", "error");
        if (!$scope.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($scope.email)) return $scope.showToast("Valid email is required", "error");
        if (!$scope.occupancyTypeId) return $scope.showToast("Please select an Occupancy Type", "error");
        if (!$scope.leaseStart) return $scope.showToast("Lease Start date is required", "error");

        if ($scope.leaseStart && $scope.leaseEnd && new Date($scope.leaseEnd) <= new Date($scope.leaseStart)) {
            return $scope.showToast("Lease End date must be after the Lease Start date", "error");
        }

        if ($scope.occupancyTypeId === 2) {
            if (!$scope.co_occupants || $scope.co_occupants.length === 0) return $scope.showToast("Please add at least one additional occupant.", "error");
            for (var i = 0; i < $scope.co_occupants.length; i++) {
                if (!$scope.co_occupants[i].name || !$scope.co_occupants[i].phone) {
                    return $scope.showToast("Co-occupant #" + (i + 1) + " must have a name and phone number.", "error");
                }
            }
        }

        var targetTid = id || ($scope.editingTenant ? $scope.editingTenant.Tid : null);

        service.saveTenantService(tenantData, $scope.co_occupants, $scope.idFiles, targetTid).then(function (response) {
            if (response.data.success) {
                $scope.showToast(response.data.message, "success");
                $scope.editorModal = false;
                if (typeof $scope.getAllTenants === 'function') $scope.getAllTenants();
            } else {
                $scope.showToast(response.data.message || "Failed to save tenant.", "error");
            }
        }).finally(function () { $scope.editorModal = false; });
    };

    $scope.triggerConfirmDeleteTenant = function (id) {
        $scope.selectedTenant = id;
        $scope.deleteTenantConfirm = true;
    };

    $scope.deleteTenant = function (id) {
        service.DeleteTenantService(id).then(function (response) {
            $scope.showToast(response.data.message, response.data.success ? "success" : "error");
        }).finally(function () {
            $scope.deleteTenantConfirm = false;
            $scope.getAllTenants();
        });
    };

    // ==========================================
    // 9. Booking MANAGEMENT (CRUD & Filters)
    // ==========================================
    $scope.getAllBookings = function () {
        service.GetAllBookingsService().then(function (response) {
            if (response.data.success) {
                $scope.bookings = response.data.bookings;
                $scope.busyDates = response.data.busyDates || [];
                $scope.currentFilter = 'All';
                $scope.statusFilter = '';
                $scope.groupedBookings = {};
                $scope.upcomingBookings = [];

                var now = new Date();
                $scope.upcomingBookings = $scope.bookings.filter(function (b) {
                    var bookDate = new Date(b.datetime);
                    return (b.status === 'Pending' || b.status === 'Confirmed') && bookDate >= now;
                });

                $scope.upcomingBookings.forEach(function (b) {
                    var d = new Date(b.datetime);
                    var year = d.getFullYear();
                    var month = String(d.getMonth() + 1).padStart(2, '0');
                    var day = String(d.getDate()).padStart(2, '0');
                    var dateKey = year + '-' + month + '-' + day;

                    if (!$scope.groupedBookings[dateKey]) {
                        $scope.groupedBookings[dateKey] = [];
                    }
                    $scope.groupedBookings[dateKey].push(b);
                });

            } else {
                $scope.showToast("Failed to load bookings", "error");
            }
        });
    };

    // Form & Loading States
    $scope.declineReason = "";
    $scope.declineCustom = "";
    $scope.declineLoading = false;
    $scope.confirmLoading = false;

    $scope.DECLINE_REASONS = [
        "Unit Unavailable",
        "Incomplete Details",
        "Schedule Conflict",
        "Other"
    ];

    $scope.openDetailModal = function (booking) {
        $scope.selectedBooking = booking;
        setTimeout(function () {
            if (window.lucide) { window.lucide.createIcons(); }
        }, 50);
    };

    $scope.closeModal = function () {
        $scope.selectedBooking = null;
    };

    $scope.isDateBusy = function (datetimeString) {
        if (!datetimeString || !$scope.busyDates) return false;
        var dateOnly = datetimeString.split('T')[0];
        return $scope.busyDates.indexOf(dateOnly) !== -1;
    };

    $scope.removeBusyDt = function (dateStr) {
        service.RemoveBusyDateService(dateStr).then(function (response) {
            if (response.data.success) {
                var idx = $scope.busyDates.indexOf(dateStr);
                if (idx !== -1) {
                    $scope.busyDates.splice(idx, 1);
                }
                $scope.showToast("Busy date removed successfully.", "success");
                $scope.getAllBookings();
            } else {
                $scope.showToast("Error: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred.", "error");
        });
    };

    $scope.clearBusyDt = function () {
        var isSure = confirm("Are you sure you want to clear ALL busy dates?");

        if (isSure) {
            service.RemoveBusyDateService("ALL").then(function (response) {
                if (response.data.success) {
                    $scope.busyDates = [];
                    $scope.showToast("All busy dates cleared.", "success");
                    $scope.getAllBookings();
                } else {
                    $scope.showToast("Error: " + response.data.message, "error");
                }
            }, function (error) {
                $scope.showToast("Server error occurred.", "error");
            });
        }
    };

    $scope.openDecline = function (booking) {
        $scope.closeModal();
        $scope.declineTarget = booking;
        $scope.declineReason = "";
        $scope.declineCustom = "";
        $scope.declineLoading = false;

        setTimeout(function () { if (window.lucide) { window.lucide.createIcons(); } }, 50);
    };

    $scope.closeDecline = function () {
        $scope.declineTarget = null;
    };

    $scope.setDeclineReason = function (reason) {
        $scope.declineReason = reason;
        if (reason !== 'Other') {
            $scope.declineCustom = "";
        }
    };

    $scope.submitDecline = function () {
        $scope.declineLoading = true;
        var finalReason = $scope.declineReason === 'Other' ? $scope.declineCustom : $scope.declineReason;

        service.DeclineBookingService($scope.declineTarget.id, finalReason).then(function (response) {
            if (response.data.success) {
                $scope.declineTarget.status = 'Declined';
                $scope.declineTarget.cancelReason = finalReason;
                $scope.declineLoading = false;
                $scope.closeDecline();

                $scope.showToast("Booking declined successfully.", "success");
                $scope.getAllBookings();
            } else {
                $scope.declineLoading = false;
                $scope.showToast("Error: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.declineLoading = false;
            $scope.showToast("Server error occurred.", "error");
        });
    };

    $scope.openConfirm = function (booking) {
        $scope.closeModal();
        $scope.confirmTarget = booking;
        $scope.confirmLoading = false;

        setTimeout(function () { if (window.lucide) { window.lucide.createIcons(); } }, 50);
    };

    $scope.aso = function () {
        $scope.showToast("1", "info");
    }

    $scope.closeConfirm = function () {
        $scope.confirmTarget = null;
    };

    $scope.submitConfirm = function () {
        $scope.confirmLoading = true;

        service.ConfirmBookingService($scope.confirmTarget.id).then(function (response) {
            if (response.data.success) {
                $scope.confirmTarget.status = 'Confirmed';
                $scope.confirmLoading = false;
                $scope.closeConfirm();

                $scope.showToast("Booking confirmed! Guest has been notified.", "success");
                $scope.getAllBookings();
            } else {
                $scope.confirmLoading = false;
                $scope.showToast("Error: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.confirmLoading = false;
            $scope.showToast("Server error occurred.", "error");
        });
    };

    $scope.setFilter = function (tabName) {
        $scope.currentFilter = tabName;
        if (tabName === 'All') {
            $scope.statusFilter = '';
        } else {
            $scope.statusFilter = tabName;
        }
    };

    $scope.isBusyOpen = false;
    $scope.busyDates = [];

    $scope.DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    $scope.MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    var today = new Date();
    $scope.todayDate = today.getDate();
    $scope.todayMonth = today.getMonth();
    $scope.todayYear = today.getFullYear();

    $scope.calMonth = today.getMonth();
    $scope.calYear = today.getFullYear();

    $scope.generateCalendar = function () {
        var firstDay = new Date($scope.calYear, $scope.calMonth, 1).getDay();
        var daysInMonth = new Date($scope.calYear, $scope.calMonth + 1, 0).getDate();

        $scope.emptySlots = new Array(firstDay);
        $scope.monthDays = [];

        for (var i = 1; i <= daysInMonth; i++) {
            var dStr = $scope.calYear + '-' + String($scope.calMonth + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
            var isPast = false;

            if ($scope.calYear < $scope.todayYear) {
                isPast = true;
            } else if ($scope.calYear === $scope.todayYear && $scope.calMonth < $scope.todayMonth) {
                isPast = true;
            } else if ($scope.calYear === $scope.todayYear && $scope.calMonth === $scope.todayMonth && i < $scope.todayDate) {
                isPast = true;
            }

            $scope.monthDays.push({
                num: i,
                dateStr: dStr,
                isPast: isPast,
                isToday: ($scope.calYear === $scope.todayYear && $scope.calMonth === $scope.todayMonth && i === $scope.todayDate)
            });
        }
    };

    $scope.nextCal = function () {
        if ($scope.calMonth === 11) {
            $scope.calMonth = 0;
            $scope.calYear++;
        } else {
            $scope.calMonth++;
        }
        $scope.generateCalendar();
    };

    $scope.prevCal = function () {
        if ($scope.calMonth === 0) {
            $scope.calMonth = 11;
            $scope.calYear--;
        } else {
            $scope.calMonth--;
        }
        $scope.generateCalendar();
    };

    $scope.isBusy = function (dateStr) {
        return $scope.busyDates.indexOf(dateStr) !== -1;
    };

    $scope.toggleBusyDate = function (dayObj) {
        if (dayObj.isPast) return;

        service.ToggleBusyDateService(dayObj.dateStr).then(function (response) {
            if (response.data.success) {
                var idx = $scope.busyDates.indexOf(dayObj.dateStr);

                if (response.data.action === "added" && idx === -1) {
                    $scope.busyDates.push(dayObj.dateStr);
                }
                else if (response.data.action === "removed" && idx !== -1) {
                    $scope.busyDates.splice(idx, 1);
                }

                $scope.busyDates.sort();
                $scope.showToast("Busy schedule updated successfully.", "success");
                $scope.getAllBookings();

            } else {
                $scope.showToast("Failed to update busy schedule: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while updating the calendar.", "error");
        });
    };

    $scope.removeBusyDate = function (dateStr) {
        var idx = $scope.busyDates.indexOf(dateStr);
        if (idx !== -1) {
            $scope.busyDates.splice(idx, 1);
        }
    };

    $scope.clearAllBusy = function () {
        $scope.busyDates = [];
    };

    $scope.formatDateLabel = function (dateStr) {
        var parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        var d = parseInt(parts[2], 10);
        return $scope.MONTHS_FULL[m] + ' ' + d + ', ' + y;
    };

    $scope.generateCalendar();


    // ==========================================
    // 10. MAINTENANCE CRUD
    // ==========================================
    $scope.maintenanceRequests = [];
    $scope.units = [];

    $scope.maintenanceStatusFilter = 'All';
    $scope.maintenanceSearch = '';

    $scope.previewPhoto = null;
    $scope.scheduleOpen = false;
    $scope.addOpen = false;
    $scope.resolveConfirmReq = null;

    $scope.scheduleOpen = false;
    $scope.schedulingReq = null;
    $scope.schedDate = null;
    $scope.schedTime = null;
    $scope.isSubmittingSchedule = false;

    $scope.timeOptions = [
        "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
    ];

    $scope.openAddModal = function () {
        $scope.unitId = "";
        $scope.Tid = "";
        $scope.category = "Plumbing";
        $scope.priority = "Medium";
        $scope.description = "";

        $scope.isSubmitting = false;
        $scope.addOpen = true;

        setTimeout(function () {
            if (window.lucide) { window.lucide.createIcons(); }
        }, 50);
    };

    $scope.closeAddModal = function () {
        $scope.addOpen = false;
    };

    $scope.openResolveModal = function (req) {
        $scope.resolveConfirmReq = req;
    };

    $scope.closeResolveModal = function () {
        $scope.resolveConfirmReq = null;
    };

    $scope.markAsResolved = function (id) {
        $scope.isResolving = true;
        var payload = {
            id: id,
            status: "Resolved"
        };

        service.SaveMaintenanceRequestService(payload, id).then(function (response) {
            if (response.data.success) {
                $scope.isResolving = false;
                $scope.showToast("Request Resolved Successfully", "success");
                $scope.getAllMaintenance();
            } else {
                $scope.isResolving = false;
                $scope.showToast("Failed to Resolve, Please Try Again", "error");
            }
        }).finally(function () {
            $scope.resolveConfirmReq = null;
        })
    }

    $scope.submitAddRequest = function () {
        if (!$scope.unitId || !$scope.description) {
            $scope.showToast("Please select a unit and provide a description.", "error");
            return;
        }

        $scope.isSubmitting = true;

        var payload = {
            id: null,
            Uid: $scope.unitId,
            Tid: $scope.Tid,
            category: $scope.category,
            priority: $scope.priority,
            description: $scope.description
        };

        service.SaveMaintenanceRequestService(payload, null).then(function (response) {
            if (response.data.success) {
                $scope.isSubmitting = false;
                $scope.closeAddModal();
                $scope.showToast(response.data.message, "success");
                $scope.getAllMaintenance();

            } else {
                $scope.isSubmitting = false;
                $scope.showToast("Failed to add request: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.isSubmitting = false;
            $scope.showToast("Server error occurred while adding the request.", "error");
        }).finally(function () {
            $scope.closeResolveModal();
        })
    };

    $scope.opnSchedModal = function (req) {
        $scope.schedulingReq = angular.copy(req);
        if (req.scheduledDate) {
            $scope.schedDate = new Date(req.scheduledDate);
        } else {
            $scope.schedDate = null;
        }

        $scope.schedTime = req.scheduledTime || null;
        $scope.isSubmittingSchedule = false;
        $scope.scheduleOpen = true;
    };

    $scope.closeScheduleModal = function () {
        $scope.scheduleOpen = false;
        $scope.schedulingReq = null;
    };

    $scope.submitSchedule = function () {
        if (!$scope.schedDate || !$scope.schedTime) {
            $scope.showToast("Please select both a date and a time.", "error");
            return;
        }

        $scope.isSubmittingSchedule = true;

        var dateObj = new Date($scope.schedDate);
        var dateString = dateObj.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        var combinedDateTimeStr = dateString + " " + $scope.schedTime;

        var payload = {
            id: $scope.schedulingReq.id,
            Uid: $scope.schedulingReq.Uid,
            Tid: $scope.schedulingReq.Tid,
            category: $scope.schedulingReq.category,
            priority: $scope.schedulingReq.priority,
            description: $scope.schedulingReq.description,
            resolvedDate: combinedDateTimeStr,
            status: "In Progress"
        };

        service.SaveMaintenanceRequestService(payload).then(function (response) {
            if (response.data.success) {
                $scope.closeScheduleModal();
                $scope.showToast("Schedule confirmed successfully.", "success");
                $scope.getAllMaintenance();
            } else {
                $scope.showToast("Error: " + response.data.message, "error");
            }
            $scope.isSubmittingSchedule = false;
        }, function (error) {
            $scope.showToast("Server error.", "error");
            $scope.isSubmittingSchedule = false;
        });
    };

    $scope.getAllMaintenance = function () {
        service.GetAllMaintenanceService().then(function (response) {
            if (response.data.success) {
                $scope.maintenanceRequests = response.data.requests || [];
                $scope.units = response.data.units || [];
                $scope.tenants = response.data.tenants || [];

                setTimeout(function () {
                    if (window.lucide) { window.lucide.createIcons(); }
                }, 50);

            } else {
                $scope.showToast("Failed to load maintenance data: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while fetching maintenance requests.", "error");
        });
    };


    $scope.countByStatus = function (status) {
        if (!$scope.maintenanceRequests) return 0;
        return $scope.maintenanceRequests.filter(function (req) {
            return req.status === status;
        }).length;
    };

    $scope.filteredMaintenance = function () {
        if (!$scope.maintenanceRequests) return [];

        return $scope.maintenanceRequests.filter(function (req) {
            var matchStatus = true;
            if ($scope.maintenanceStatusFilter !== 'All') {
                matchStatus = (req.status === $scope.maintenanceStatusFilter);
            }

            var matchSearch = true;
            if ($scope.maintenanceSearch && $scope.maintenanceSearch.trim() !== '') {
                var term = $scope.maintenanceSearch.toLowerCase().trim();
                matchSearch =
                    (req.category && req.category.toLowerCase().includes(term)) ||
                    (req.description && req.description.toLowerCase().includes(term)) ||
                    (req.unitName && req.unitName.toLowerCase().includes(term)) ||
                    (req.tenantName && req.tenantName.toLowerCase().includes(term));
            }

            return matchStatus && matchSearch;
        });
    };

    $scope.setStatusFilter = function (status) {
        $scope.maintenanceStatusFilter = status;
    };

    // ==============================================
    // 11. PAYMENTS
    // ==============================================
    $scope.payments = [];
    $scope.paymentFilter = 'All';
    $scope.paymentSearch = '';

    $scope.totalPaid = 0;
    $scope.totalOverdue = 0;
    $scope.totalUnpaid = 0;

    $scope.openMarkPaidModal = function (payment) {
        $scope.markPaidTarget = payment;
        $scope.paidUntil = null;
        $scope.previewMonths = [];
        $scope.generateMonthOptions();
    };

    $scope.selectPaidUntil = function (opt) {
        if ($scope.paidUntil === opt.key) {
            $scope.paidUntil = null;
            $scope.previewMonths = [];
        } else {
            $scope.paidUntil = opt.key;
            $scope.updatePreviewMonths();
        }
    };

    $scope.isInRange = function (opt) {
        if (!$scope.paidUntil) return false;

        const optIdx = $scope.monthOptions.findIndex(m => m.key === opt.key);
        const endIdx = $scope.monthOptions.findIndex(m => m.key === $scope.paidUntil);
        return optIdx >= 0 && optIdx <= endIdx;
    };

    $scope.updatePreviewMonths = function () {
        if (!$scope.paidUntil) { $scope.previewMonths = []; return; }

        const endIdx = $scope.monthOptions.findIndex(m => m.key === $scope.paidUntil);
        $scope.previewMonths = $scope.monthOptions
            .slice(0, endIdx + 1)
            .map(m => m.shortMonth + ' ' + m.year);
    };

    $scope.generateMonthOptions = function () {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const options = [];
        let date = new Date();

        for (let i = 0; i < 12; i++) {
            let futureDate = new Date(date.getFullYear(), date.getMonth() + i, 1);
            options.push({
                shortMonth: months[futureDate.getMonth()],
                year: futureDate.getFullYear(),
                key: futureDate.getMonth() + '-' + futureDate.getFullYear()
            });
        }
        $scope.monthOptions = options;
    };

    $scope.confirmMarkPaid = function () {
        if (!$scope.paidUntil || !$scope.markPaidTarget) return;

        const endIdx = $scope.monthOptions.findIndex(m => m.key === $scope.paidUntil);
        const months = $scope.monthOptions.slice(0, endIdx + 1).map(m => ({
            Month: parseInt(m.key.split('-')[0]) + 1,
            Year: parseInt(m.key.split('-')[1])
        }));

        const payload = {
            Tid: $scope.markPaidTarget.Tid,
            Uid: $scope.markPaidTarget.Uid,
            amount: $scope.markPaidTarget.amount,
            months: months
        };

        service.MarkPaymentsPaidService(payload)
            .then(function (res) {
                if (res.data.success) {
                    $scope.showToast('Payments updated successfully!', 'success');
                    $scope.markPaidTarget = null;
                    $scope.paidUntil = null;
                    $scope.previewMonths = [];
                    $scope.getAllPayments();
                } else {
                    $scope.showToast('Error: ' + res.data.message, "error");
                }
            });
    };

    $scope.getAllPayments = function () {
        service.getAllPaymentService().then(function (response) {
            if (response.data.success) {
                $scope.payments = response.data.data;
                $scope.calculateTotals();

                setTimeout(function () {
                    if (window.lucide) { window.lucide.createIcons(); }
                }, 50);

            } else {
                $scope.showToast("Error loading payments: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while fetching payments.", "error");
        });
    };

    $scope.calculateTotals = function () {
        $scope.totalPaid = 0;
        $scope.totalOverdue = 0;
        $scope.totalUnpaid = 0;

        $scope.payments.forEach(function (p) {
            if (p.status === 'Paid') $scope.totalPaid += p.amount;
            else if (p.status === 'Overdue') $scope.totalOverdue += p.amount;
            else if (p.status === 'Unpaid') $scope.totalUnpaid += p.amount;
        });
    };

    $scope.countByPaymentStatus = function (status) {
        if (!$scope.payments) return 0;
        return $scope.payments.filter(function (p) { return p.status === status; }).length;
    };

    $scope.setStatusFilter = function (status) {
        $scope.paymentFilter = status;
    };

    $scope.filteredPayments = function () {
        if (!$scope.payments) return [];

        return $scope.payments.filter(function (p) {
            var matchStatus = ($scope.paymentFilter === 'All' || p.status === $scope.paymentFilter);
            var matchSearch = true;
            if ($scope.paymentSearch && $scope.paymentSearch.trim() !== '') {
                var term = $scope.paymentSearch.toLowerCase().trim();
                matchSearch = (p.tenantName && p.tenantName.toLowerCase().includes(term)) ||
                    (p.unitName && p.unitName.toLowerCase().includes(term)) ||
                    (p.month && p.month.toLowerCase().includes(term));
            }

            return matchStatus && matchSearch;
        });
    };

    // ==========================================
    // 12. FILE UPLOADS (Images & IDs)
    // ==========================================

    $scope.MAX_UNIT_IMAGES = 10;

    $scope.handleImageUpload = function (files) {
        if (!files || files.length === 0) return;

        if (!$scope.imageUrls) $scope.imageUrls = [];

        var room = $scope.MAX_UNIT_IMAGES - $scope.imageUrls.length;

        if (room <= 0) {
            $scope.$apply(function () {
                $scope.showToast("Maximum of " + $scope.MAX_UNIT_IMAGES + " images reached.", "error");
            });
            return;
        }

        var toProcess = Math.min(files.length, room);

        if (files.length > room) {
            $scope.$apply(function () {
                $scope.showToast("Only " + room + " more image(s) can be added.", "info");
            });
        }

        for (var i = 0; i < toProcess; i++) {
            (function (file) {
                if (file.type.indexOf('image/') !== 0) return;

                var reader = new FileReader();

                reader.onload = function (event) {
                    var img = new Image();

                    img.onload = function () {
                        var MAX_WIDTH = 1600;
                        var w = img.width;
                        var h = img.height;

                        if (w > MAX_WIDTH) {
                            h = Math.round(h * (MAX_WIDTH / w));
                            w = MAX_WIDTH;
                        }

                        var canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                        var resized = canvas.toDataURL('image/jpeg', 0.8);

                        $scope.$apply(function () {
                            $scope.imageUrls.push(resized);
                        });
                    };

                    img.src = event.target.result;
                };

                reader.readAsDataURL(file);
            })(files[i]);
        }

        // Clear the input so the same file can be picked again after removal
        var input = document.getElementById('unitImageInput');
        if (input) input.value = '';
    };

    $scope.videoUploading = false;
    $scope.videoName = '';

    $scope.triggerVideoUpload = function () {
        document.getElementById('unitVideoInput').click();
    };

    $scope.handleVideoUpload = function (files) {
        if (!files || files.length === 0) return;

        var file = files[0];

        $scope.$apply(function () {
            $scope.videoUploading = true;
            $scope.videoName = file.name;
        });

        service.UploadUnitVideoService(file).then(function (response) {
            if (response.data.success) {
                $scope.videoUrl = response.data.url;
                $scope.showToast("Video uploaded.", "success");
            } else {
                $scope.videoName = '';
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.videoName = '';
            $scope.showToast("Server error occurred while uploading the video.", "error");
        }).finally(function () {
            $scope.videoUploading = false;

            var input = document.getElementById('unitVideoInput');
            if (input) input.value = '';
        });
    };

    $scope.removeVideo = function () {
        $scope.videoUrl = '';
        $scope.videoName = '';
    };

    $scope.removeImage = function (index) {
        $scope.imageUrls.splice(index, 1);
    };

    $scope.handleIdUpload = function (files) {
        // 1. Ensure a file was selected
        if (!files || files.length === 0) return;

        // Grab the single file
        var file = files[0];

        $scope.$apply(function () {
            if (!$scope.idFiles) $scope.idFiles = [];

            // 2. Check max 2 limit
            if ($scope.idFiles.length >= 2) {
                console.warn("Maximum of 2 ID documents reached.");
                return;
            }

            // 3. Strict check for images only
            if (file.type.indexOf('image/') !== 0) {
                console.warn("Rejected non-image file: " + file.name);
                return;
            }

            // 4. Process single image
            var reader = new FileReader();
            reader.onload = function (event) {
                $scope.$apply(function () {
                    $scope.idFiles.push({
                        fileObj: file,
                        name: file.name,
                        url: event.target.result
                    });
                });
            };
            reader.readAsDataURL(file);
        });

        // 5. Clear input so the same file can be selected again if deleted
        var idInput = document.getElementById('idFileInput');
        if (idInput) idInput.value = '';
    };

    $scope.deletedDocumentIds = [];

    $scope.removeIdFile = function (index) {
        var file = $scope.idFiles[index];
        if (file.id) {
            $scope.deletedDocumentIds.push(file.id);
        }
        $scope.idFiles.splice(index, 1);
    };

    // --- 1. Initial Form State ---
    $scope.MAINTENANCE_CATEGORIES = [
        "Plumbing", "Electrical", "Air Conditioning", "Internet / WiFi",
        "Doors & Locks", "Appliances", "Flooring", "Painting", "Others"
    ];

    $scope.showRequestForm = false;
    $scope.reqCategory = $scope.MAINTENANCE_CATEGORIES[0];
    $scope.reqDescription = "";
    $scope.reqPhoto = null;
    $scope.reqPhotoName = "";
    $scope.submitting = false;

    // --- 2. Load Data from C# Backend ---
    $scope.init = function () {
        $http.get('/TenantPortal/GetCurrentTenantData')
            .then(function (response) {
                var data = response.data;

                if (!data.success) {
                    $window.location.href = '/System/Auth';
                    return;
                }

                // ==========================================
                // 🐛 DATA CHECKER START
                // ==========================================

                // 1. Check Tenant Object
                if (!data.tenant) {
                    console.error("🚨 ERROR: Tenant object is completely missing from response!", data);
                    return; // Stop execution if we don't even have a tenant
                }
                $scope.currentTenant = data.tenant;

                // 2. Check Co-occupants Array
                $scope.currentTenant.additionalOccupants = data.coOccupants || [];
                if ($scope.currentTenant.additionalOccupants.length > 0) {
                    console.log("✅ Co-occupants successfully loaded:", $scope.currentTenant.additionalOccupants);
                } else {
                    console.warn("⚠️ No co-occupants found. Array is empty.", data.coOccupants);
                }

                // 3. Check Unit Name
                $scope.currentTenant.unit = data.unitName;
                if ($scope.currentTenant.unit && $scope.currentTenant.unit !== "Unassigned") {
                    console.log("✅ Unit name successfully loaded:", $scope.currentTenant.unit);
                } else {
                    console.warn("⚠️ Unit name is missing, null, or 'Unassigned'.", data.unitName);
                }

                console.log("📦 FINAL TENANT PAYLOAD:", $scope.currentTenant);

                // ==========================================
                // 🐛 DATA CHECKER END
                // ==========================================

                if ($scope.currentTenant.isTerminated === 1) {
                    $scope.handleLogout(true);
                    return;
                }

                console.log("🆔 Proceeding to load portal data for Tid:", $scope.currentTenant.Tid);
                $scope.loadPortalData($scope.currentTenant.Tid); // ✅ fixed
            })
            .catch(function (error) {
                console.error("Auth error", error);
                $window.location.href = '/System/Auth';
            });
    }

    $scope.loadPortalData = function (tid) {
        // Fetch Maintenance
        $http.get('/TenantPortal/GetMaintenanceRequests?tid=' + tid).then(function (res) {
            var maintenance = res.data || [];
            $scope.myMaintenance = maintenance.sort(function (a, b) {
                return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
            });
        });

        // Fetch Payments
        $http.get('/TenantPortal/GetPayments?tid=' + tid).then(function (res) {
            var payments = res.data || [];
            $scope.myPayments = payments.sort(function (a, b) {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });

            $scope.latestPayment = $scope.myPayments[$scope.myPayments.length - 1] || null;
            $scope.paidPaymentsCount = $scope.myPayments.filter(function (p) { return p.status === 'Paid'; }).length;
            $scope.unpaidPaymentsCount = $scope.myPayments.filter(function (p) { return p.status === 'Unpaid'; }).length;
            $scope.overduePaymentsCount = $scope.myPayments.filter(function (p) { return p.status === 'Overdue'; }).length;
        });

        // Compute Lease Days
        if ($scope.currentTenant.leaseEnd) {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var end = new Date($scope.currentTenant.leaseEnd);
            end.setHours(0, 0, 0, 0);
            $scope.daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
            $scope.daysLeft = null;
        }

        // Compute Live Status
        if ($scope.daysLeft === null) $scope.liveStatus = "active";
        else if ($scope.daysLeft < 0) $scope.liveStatus = "inactive";
        else if ($scope.daysLeft <= 45) $scope.liveStatus = "expiring";
        else $scope.liveStatus = "active";

        // Co-occupant check
        $scope.hasCoOccupants = $scope.currentTenant.additionalOccupants && $scope.currentTenant.additionalOccupants.length > 0;
    }


    // --- 3. Actions & Logic ---

    $scope.handleLogout = function (wasTerminated) {
        $http.post('/System/Logout').then(function () {
            $window.location.href = '/System/Auth';
            if (wasTerminated) {
                $scope.showToast("Your account has been terminated. Please contact the property management office.", "error");
            }
        });
    };

    $scope.toggleRequestForm = function () {
        $scope.showRequestForm = !$scope.showRequestForm;
    };

    $scope.triggerPhotoUpload = function () {
        document.getElementById('photoInput').click();
    };

    $scope.handlePhotoChange = function (event) {
        var file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            $scope.showToast("Please select an image file.", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            $scope.showToast("Image must be under 5MB.", "error");
            return;
        }

        // Apply phase for file name
        $scope.$apply(function () {
            $scope.reqPhotoName = file.name;
        });

        var reader = new FileReader();
        reader.onload = function (ev) {
            $scope.$apply(function () {
                $scope.reqPhoto = ev.target.result;
            });
        };
        reader.readAsDataURL(file);
    };

    $scope.handleRemovePhoto = function () {
        $scope.reqPhoto = null;
        $scope.reqPhotoName = "";
        var input = document.getElementById('photoInput');
        if (input) input.value = "";
    };

    $scope.handleSubmitRequest = function (event) {
        console.log("1. Function started");
        if (event) event.preventDefault();

        console.log("2. Checking description:", $scope.reqDescription);
        if (!$scope.reqDescription || !$scope.reqDescription.trim()) {
            console.warn("-> STOPPED: Description is empty!");
            try {
                $scope.showToast("Please describe the issue.", "error");
            } catch (e) {
                console.error("-> CRASHED: $scope.showToast is not working!", e);
            }
            return;
        }

        console.log("3. Checking tenant data:", $scope.currentTenant);
        if (!$scope.currentTenant) {
            console.error("-> CRASHED: $scope.currentTenant is undefined! Cannot get Tid.");
            $scope.showToast("System error: Tenant data not loaded.", "error");
            return;
        }

        $scope.submitting = true;

        var newRequest = {
            Tid: $scope.currentTenant.Tid,
            Uid: $scope.currentTenant.unitId,
            category: $scope.reqCategory,
            description: $scope.reqDescription.trim(),
            status: "Pending",
            priority: "Medium",
            reportedDate: new Date().toISOString()
        };

        if ($scope.reqPhoto) {
            newRequest.reqPhoto = $scope.reqPhoto;
        }

        console.log("4. Ready to POST this payload:", newRequest);

        $http.post('/TenantPortal/SubmitMaintenanceRequest', newRequest)
            .then(function (response) {
                console.log("5. Server responded:", response.data);
                if (response.data.success) {
                    $scope.showToast("Maintenance request submitted! We'll get back to you soon.", "success");
                    $scope.loadPortalData($scope.currentTenant.Tid);

                    $scope.reqDescription = "";
                    $scope.reqCategory = $scope.MAINTENANCE_CATEGORIES[0];
                    $scope.handleRemovePhoto();
                    $scope.showRequestForm = false;
                } else {
                    $scope.showToast(response.data.message || "Failed to submit request.", "error");
                }
            })
            .catch(function (error) {
                console.error("6. HTTP POST Failed:", error);
                $scope.showToast("A server error occurred.", "error");
            })
            .finally(function () {
                $scope.submitting = false;
            });
    };

    // --- 4. UI Helpers (Classes & Formatters) ---

    $scope.getPaymentBadgeClass = function (status) {
        if (status === "Paid") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
        if (status === "Overdue") return "bg-red-50 text-red-600 border border-red-100";
        return "bg-amber-50 text-amber-700 border border-amber-100";
    };

    $scope.getPaymentRowClass = function (status) {
        if (status === "Paid") return "border-l-4 border-emerald-400 bg-emerald-50/40";
        if (status === "Overdue") return "border-l-4 border-red-400 bg-red-50/40";
        return "border-l-4 border-amber-400 bg-amber-50/40";
    };

    $scope.getMaintenanceStatusClass = function (status) {
        if (status === "Resolved") return "bg-emerald-50 text-emerald-700";
        if (status === "In Progress") return "bg-green-50 text-green-700";
        return "bg-amber-50 text-amber-700";
    };

    $scope.formatScheduledDate = function (dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
            weekday: "short", month: "short", day: "numeric", year: "numeric"
        });
    };

    // ==========================================
    // ==========================================
    // 13. BROWSE UNITS (RENTERS)
    // ==========================================
    $scope.browseUnits = [];
    $scope.browseCount = 0;

    $scope.browseQuery = '';
    $scope.browseBeds = [];
    $scope.browseAmenities = [];
    $scope.browsePriceMin = '';
    $scope.browsePriceMax = '';

    $scope.browseShowFilters = false;
    $scope.bannerDismissed = false;

    $scope.BED_OPTIONS = [];
    $scope.AMENITY_OPTIONS = [];

    $scope.getAllBrowseUnits = function () {
        // Pick up a search term handed over from the Home page, then clear it
        // so it doesn't stick around on refresh.
        var handoff = sessionStorage.getItem('browseSearch');
        if (handoff) {
            $scope.browseQuery = handoff;
            sessionStorage.removeItem('browseSearch');
        }

        service.GetBrowseUnitsService().then(function (response) {
            if (response.data.success) {
                $scope.browseUnits = response.data.data || [];
                $scope.BED_OPTIONS = response.data.bedOptions || [];
                $scope.AMENITY_OPTIONS = response.data.amenityOptions || [];

                setTimeout(function () {
                    if (window.lucide) { window.lucide.createIcons(); }
                }, 50);

            } else {
                $scope.showToast("Error loading units: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while fetching units.", "error");
        });
    };

    $scope.filteredBrowse = function () {
        var list = $scope.browseUnits || [];

        if ($scope.browseQuery) {
            var q = $scope.browseQuery.toLowerCase().trim();
            list = list.filter(u =>
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.beds && u.beds.toLowerCase().includes(q)) ||
                (u.description && u.description.toLowerCase().includes(q)) ||
                (u.address && u.address.toLowerCase().includes(q)) ||
                (u.amenities && u.amenities.some(a => a.toLowerCase().includes(q)))
            );
        }

        if ($scope.browseBeds.length > 0) {
            list = list.filter(u => $scope.browseBeds.indexOf(u.beds) !== -1);
        }

        // Unit must have EVERY selected amenity, not just one
        if ($scope.browseAmenities.length > 0) {
            list = list.filter(u =>
                $scope.browseAmenities.every(a => u.amenities && u.amenities.indexOf(a) !== -1)
            );
        }

        if ($scope.browsePriceMin) {
            list = list.filter(u => u.price >= parseInt($scope.browsePriceMin));
        }
        if ($scope.browsePriceMax) {
            list = list.filter(u => u.price <= parseInt($scope.browsePriceMax));
        }

        $scope.browseCount = list.length;
        return list;
    };

    $scope.activeFilterCount = function () {
        return $scope.browseBeds.length +
            $scope.browseAmenities.length +
            ($scope.browsePriceMin ? 1 : 0) +
            ($scope.browsePriceMax ? 1 : 0);
    };

    $scope.isBedSelected = function (bed) {
        return $scope.browseBeds.indexOf(bed) !== -1;
    };

    $scope.isAmenitySelected = function (amenity) {
        return $scope.browseAmenities.indexOf(amenity) !== -1;
    };

    $scope.toggleBed = function (bed) {
        var idx = $scope.browseBeds.indexOf(bed);
        if (idx === -1) $scope.browseBeds.push(bed);
        else $scope.browseBeds.splice(idx, 1);
    };

    $scope.toggleAmenity = function (amenity) {
        var idx = $scope.browseAmenities.indexOf(amenity);
        if (idx === -1) $scope.browseAmenities.push(amenity);
        else $scope.browseAmenities.splice(idx, 1);
    };

    $scope.clearQuery = function () {
        $scope.browseQuery = '';
    };

    $scope.clearAllBrowse = function () {
        $scope.browseBeds = [];
        $scope.browseAmenities = [];
        $scope.browsePriceMin = '';
        $scope.browsePriceMax = '';
        $scope.browseQuery = '';
    };

    $scope.goToUnit = function (id) {
        service.SetSelectedUnitService(id).then(function (response) {
            if (response.data.success) {
                window.location.href = '/System/RentersUnitDetails';
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while opening the unit.", "error");
        });
    };

    // ==========================================
    // 14. RENTERS HOME
    // ==========================================
    $scope.availableUnits = [];
    $scope.featuredUnits = [];
    $scope.homeTags = [];
    $scope.homeSearch = '';

    $scope.getAllHomeUnits = function () {
        service.GetBrowseUnitsService().then(function (response) {
            if (response.data.success) {
                $scope.availableUnits = response.data.data || [];

                // Show the first 6 vacant units on the landing page
                $scope.featuredUnits = $scope.availableUnits.slice(0, 6);

                // Quick-search chips come from the unit types actually vacant
                $scope.homeTags = response.data.bedOptions || [];

                setTimeout(function () {
                    if (window.lucide) { window.lucide.createIcons(); }
                }, 50);

            } else {
                $scope.showToast("Error loading units: " + response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while fetching units.", "error");
        });
    };

    // Every unit returned by GetBrowseUnits is already filtered to vacant
    $scope.getOccupancy = function (name) {
        return 'Vacant';
    };

    $scope.handleSearch = function () {
        $scope.goToBrowse($scope.homeSearch);
    };

    $scope.browseTag = function (tag) {
        $scope.goToBrowse(tag);
    };

    // Hand the search term to the Browse page through sessionStorage so it
    // stays out of the URL. No backend call needed.
    $scope.goToBrowse = function (term) {
        sessionStorage.setItem('browseSearch', term || '');
        window.location.href = '/System/RentersBrowse';
    };

    // ==========================================
    // 15. UNIT DETAIL (RENTERS)
    // ==========================================
    $scope.currentUnit = null;
    $scope.unitOccupancy = '';
    $scope.isAvailable = false;
    $scope.relatedUnits = [];

    $scope.slideIndex = 0;
    $scope.liked = false;

    $scope.getUnitDetail = function () {
        service.GetUnitDetailService().then(function (response) {
            if (response.data.success) {
                $scope.currentUnit = response.data.unit;
                $scope.unitOccupancy = response.data.occupancy;
                $scope.isAvailable = (response.data.occupancy === 'Vacant');
                $scope.relatedUnits = response.data.relatedUnits || [];
                $scope.slideIndex = 0;

                setTimeout(function () {
                    if (window.lucide) { window.lucide.createIcons(); }
                }, 50);

            } else {
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while loading the unit.", "error");
        });
    };

    $scope.setSlide = function (index) {
        $scope.slideIndex = index;
    };

    $scope.backToBrowse = function () {
        window.location.href = '/System/RentersBrowse';
    };

    $scope.getOccupancyClass = function (status) {
        if (status === 'Vacant') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        if (status === 'Expiring') return 'bg-amber-50 text-amber-700 border border-amber-100';
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    };


    // ==========================================
    // 16. BOOKING MODAL (RENTERS / VISITOR)
    // ==========================================
    // The view drives most of the modal inline (opening, closing, step
    // navigation, date/slot selection). Only the calls below need the
    // server or a loop.
    //
    // All names prefixed "bk" so nothing collides with the Auth page
    // (step, otp, resendCooldown) or Admin Bookings (DAYS, calMonth,
    // generateCalendar, busyDates).

    $scope.bookingOpen = false;
    $scope.bkStep = 'auth';          // auth | verify | calendar | slots | form | confirm | success
    $scope.bkVerified = false;

    $scope.bkName = '';
    $scope.bkEmail = '';
    $scope.bkPhone = '';
    $scope.bkErrors = {};
    $scope.bkLoading = false;

    $scope.bkOtp = [];
    $scope.bkOtpLoading = false;
    $scope.bkCooldown = 0;

    $scope.bkTcChecked = false;

    $scope.bkBusyDates = [];
    $scope.bkTaken = [];

    $scope.bkSelectedDate = null;    // "yyyy-MM-dd"
    $scope.bkSelectedSlot = null;
    $scope.bkNotes = '';
    $scope.bkLimitError = '';
    $scope.bkSubmitting = false;
    $scope.bkResult = null;

    $scope.bkDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    var bkToday = new Date();
    $scope.bkViewMonth = bkToday.getMonth();
    $scope.bkViewYear = bkToday.getFullYear();

    // ---- Page load -------------------------------------------------
    // Called from ng-init. Works out whether this visitor already
    // verified, and loads the busy days / taken slots for the calendar.

    $scope.bkCheckVisitor = function () {
        service.GetVisitorSessionService().then(function (response) {
            if (response.data.verified) {
                $scope.bkVerified = true;
                $scope.bkName = response.data.name;
                $scope.bkEmail = response.data.email;
                $scope.bkPhone = response.data.phone;
            }
        });

        $scope.bkLoadAvailability();
    };

    $scope.bkLoadAvailability = function () {
        service.GetBookingAvailabilityService().then(function (response) {
            if (response.data.success) {
                $scope.bkBusyDates = response.data.busyDates || [];
                $scope.bkTaken = response.data.taken || [];
            }
            $scope.bkGenerateCalendar();
        }, function (error) {
            $scope.bkGenerateCalendar();
        });
    };
    $scope.openBooking = function () {
        $scope.bookingOpen = true;
        $scope.bkStep = $scope.bkVerified ? 'calendar' : 'auth';
        $scope.bkSelectedDate = null;
        $scope.bkSelectedSlot = null;
        $scope.bkNotes = '';
        $scope.bkOtp = [];
        $scope.bkErrors = {};
        $scope.bkLimitError = '';
        $scope.bkTcChecked = false;
    };

    // ---- Step 1: send OTP ------------------------------------------
    // Also used by the "Resend code" button.

    function bkStartCooldown() {
        $scope.bkCooldown = 30;
        var timer = $interval(function () {
            $scope.bkCooldown--;
            if ($scope.bkCooldown <= 0) $interval.cancel(timer);
        }, 1000);
    }

    $scope.bkSendOtp = function () {
        $scope.bkErrors = {};

        if (!$scope.bkName) $scope.bkErrors.name = "Full name is required";
        if (!$scope.bkEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($scope.bkEmail)) $scope.bkErrors.email = "Valid email is required";
        if (!$scope.bkPhone) $scope.bkErrors.phone = "Phone number is required";

        if (Object.keys($scope.bkErrors).length > 0) return;

        $scope.bkLoading = true;

        var authData = {
            name: $scope.bkName,
            email: $scope.bkEmail,
            phone: $scope.bkPhone
        };

        service.SendVisitorOtpService(authData).then(function (response) {
            if (response.data.success) {
                $scope.bkOtp = [];
                $scope.bkStep = 'verify';
                bkStartCooldown();
                $scope.showToast(response.data.message, "success");
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while sending the code.", "error");
        }).finally(function () { $scope.bkLoading = false; });
    };

    // ---- Step 2: verify OTP ----------------------------------------

    $scope.bkOtpNext = function (index) {
        var val = $scope.bkOtp[index];
        if (!/^\d?$/.test(val)) { $scope.bkOtp[index] = ''; return; }
        if (val && index < 5) {
            document.getElementById('bkOtp' + (index + 1)).focus();
        }
    };

    $scope.bkVerify = function () {
        var code = $scope.bkOtp.join('');
        if (code.length < 6) {
            return $scope.showToast("Please enter the full 6-digit code.", "error");
        }

        $scope.bkOtpLoading = true;

        service.VerifyVisitorOtpService(code).then(function (response) {
            if (response.data.success) {
                $scope.bkVerified = true;
                $scope.bkName = response.data.name;
                $scope.bkEmail = response.data.email;
                $scope.bkPhone = response.data.phone;
                $scope.bkStep = 'calendar';
                $scope.showToast("Verified! Welcome, " + response.data.name, "success");
            } else {
                $scope.bkOtp = [];
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while verifying.", "error");
        }).finally(function () { $scope.bkOtpLoading = false; });
    };

    $scope.bkSwitchAccount = function () {
        service.ClearVisitorSessionService().then(function () {
            $scope.bkVerified = false;
            $scope.bkName = '';
            $scope.bkEmail = '';
            $scope.bkPhone = '';
            $scope.bkOtp = [];
            $scope.bkErrors = {};
            $scope.bkTcChecked = false;
            $scope.bkStep = 'auth';
        });
    };

    // ---- Step 3: calendar ------------------------------------------

    function bkPad(n) { return String(n).padStart(2, '0'); }

    $scope.bkGenerateCalendar = function () {
        var firstDay = new Date($scope.bkViewYear, $scope.bkViewMonth, 1).getDay();
        var daysInMonth = new Date($scope.bkViewYear, $scope.bkViewMonth + 1, 0).getDate();

        var t = new Date();
        t.setHours(0, 0, 0, 0);

        $scope.bkEmptySlots = new Array(firstDay);
        $scope.bkMonthDays = [];

        for (var i = 1; i <= daysInMonth; i++) {
            var dStr = $scope.bkViewYear + '-' + bkPad($scope.bkViewMonth + 1) + '-' + bkPad(i);
            var d = new Date($scope.bkViewYear, $scope.bkViewMonth, i);

            $scope.bkMonthDays.push({
                num: i,
                dateStr: dStr,
                isPast: d < t,
                isToday: d.getTime() === t.getTime(),
                isBusy: $scope.bkBusyDates.indexOf(dStr) !== -1,
                hasBooking: $scope.bkTaken.some(function (x) { return x.date === dStr; })
            });
        }
    };

    // delta of -1 or 1, rolls the year over on its own
    $scope.bkShiftMonth = function (delta) {
        var d = new Date($scope.bkViewYear, $scope.bkViewMonth + delta, 1);
        $scope.bkViewMonth = d.getMonth();
        $scope.bkViewYear = d.getFullYear();
        $scope.bkGenerateCalendar();
    };

    $scope.bkSelectDate = function (day) {
        if (day.isPast || day.isBusy) return;

        $scope.bkSelectedDate = day.dateStr;
        $scope.bkSelectedSlot = null;
        $scope.bkStep = 'slots';
    };

    // ---- Step 4: slots ---------------------------------------------

    // "08:00 AM" -> 8 , "01:00 PM" -> 13
    function bkSlotHour(slot) {
        var parts = slot.trim().split(' ');
        var hour = parseInt(parts[0].split(':')[0], 10);
        if (parts[1] === 'PM' && hour !== 12) hour += 12;
        if (parts[1] === 'AM' && hour === 12) hour = 0;
        return hour;
    }

    // Blocked when any live booking on that day sits under 60 minutes away
    $scope.bkIsSlotBlocked = function (slot) {
        if (!$scope.bkSelectedDate) return false;

        var slotMinutes = bkSlotHour(slot) * 60;

        return $scope.bkTaken.some(function (x) {
            if (x.date !== $scope.bkSelectedDate) return false;
            return Math.abs(slotMinutes - (x.hour * 60)) < 60;
        });
    };

    $scope.bkSelectSlot = function (slot) {
        if ($scope.bkIsSlotBlocked(slot)) return;

        $scope.bkSelectedSlot = slot;
        $scope.bkLimitError = '';
        $scope.bkStep = 'form';
    };

    // ---- Step 6: submit --------------------------------------------

    $scope.bkSubmit = function () {
        if (!$scope.bkSelectedDate || !$scope.bkSelectedSlot) return;

        $scope.bkSubmitting = true;

        var payload = {
            date: $scope.bkSelectedDate,
            slot: $scope.bkSelectedSlot,
            notes: $scope.bkNotes
        };

        service.SubmitVisitorBookingService(payload).then(function (response) {
            if (response.data.success) {
                $scope.bkResult = response.data;
                $scope.bkStep = 'success';
                $scope.showToast(response.data.message, "success");

                // Refresh so the new booking blocks its own slot right away
                $scope.bkLoadAvailability();
            } else {
                $scope.bkLimitError = response.data.message;
                $scope.bkStep = 'form';
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while submitting the booking.", "error");
        }).finally(function () { $scope.bkSubmitting = false; });
    };

    // ---- Display helper --------------------------------------------

    $scope.bkFormatDate = function (dateStr) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return $scope.bkDAYS[d.getDay()] + ', ' + $scope.MONTHS_FULL[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    };

    // ==========================================
    // 17. MY BOOKINGS (RENTERS / GUEST)
    // ==========================================
    // Prefixed "mb" so nothing collides with Admin Bookings
    // (bookings, declineTarget, declineReason, setFilter) or the
    // booking modal in section 16.

    $scope.mbVerified = false;
    $scope.mbBookings = [];
    $scope.mbName = '';
    $scope.mbEmail = '';

    $scope.mbFilter = 'All';
    $scope.mbSearch = '';
    $scope.STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Declined', 'Cancelled'];

    // Sign-in
    $scope.mbShowSignIn = false;
    $scope.mbStep = 'form';          // form | otp
    $scope.mbSignInName = '';
    $scope.mbSignInEmail = '';
    $scope.mbSignInPhone = '';
    $scope.mbErrors = {};
    $scope.mbLoading = false;
    $scope.mbOtp = [];
    $scope.mbOtpLoading = false;
    $scope.mbCooldown = 0;

    // Cancel
    $scope.mbCancelTarget = null;
    $scope.mbCancelReason = '';
    $scope.mbCustomReason = '';
    $scope.mbCancelLoading = false;
    $scope.CANCEL_REASONS = [
        "Found another unit",
        "Schedule conflict",
        "Budget constraints",
        "No longer looking",
        "Other"
    ];

    // ---- Load ------------------------------------------------------

    $scope.getMyBookings = function () {
        service.GetMyBookingsService().then(function (response) {
            if (!response.data.success) {
                return $scope.showToast(response.data.message, "error");
            }

            $scope.mbVerified = response.data.verified;
            $scope.mbBookings = response.data.data || [];
            $scope.mbName = response.data.name || '';
            $scope.mbEmail = response.data.email || '';

        }, function (error) {
            $scope.showToast("Server error occurred while loading your bookings.", "error");
        });
    };

    // ---- Filtering -------------------------------------------------

    $scope.filteredMyBookings = function () {
        var list = $scope.mbBookings || [];

        if ($scope.mbFilter !== 'All') {
            list = list.filter(function (b) { return b.status === $scope.mbFilter; });
        }

        if ($scope.mbSearch) {
            var q = $scope.mbSearch.toLowerCase().trim();
            list = list.filter(function (b) {
                return (b.unitName && b.unitName.toLowerCase().includes(q)) ||
                    (b.name && b.name.toLowerCase().includes(q)) ||
                    (b.email && b.email.toLowerCase().includes(q));
            });
        }

        return list;
    };

    $scope.mbCountByStatus = function (status) {
        if (!$scope.mbBookings) return 0;
        if (status === 'All') return $scope.mbBookings.length;

        return $scope.mbBookings.filter(function (b) { return b.status === status; }).length;
    };

    $scope.setMyBookingFilter = function (status) {
        $scope.mbFilter = status;
    };

    $scope.mbCanCancel = function (booking) {
        return booking.status === 'Pending' || booking.status === 'Confirmed';
    };

    $scope.getBookingStatusClass = function (status) {
        if (status === 'Confirmed') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        if (status === 'Pending') return 'bg-amber-50 text-amber-700 border border-amber-100';
        if (status === 'Declined') return 'bg-red-50 text-red-600 border border-red-100';
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    };

    // ---- Sign in ---------------------------------------------------

    $scope.mbOpenSignIn = function () {
        $scope.mbShowSignIn = true;
        $scope.mbStep = 'form';
        $scope.mbErrors = {};
        $scope.mbOtp = [];
    };

    $scope.mbCloseSignIn = function () {
        $scope.mbShowSignIn = false;
    };

    $scope.mbBackToForm = function () {
        $scope.mbStep = 'form';
        $scope.mbOtp = [];
    };

    function mbStartCooldown() {
        $scope.mbCooldown = 30;
        var timer = $interval(function () {
            $scope.mbCooldown--;
            if ($scope.mbCooldown <= 0) $interval.cancel(timer);
        }, 1000);
    }

    $scope.mbSendOtp = function () {
        $scope.mbErrors = {};

        if (!$scope.mbSignInName) $scope.mbErrors.name = "Full name is required";
        if (!$scope.mbSignInEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($scope.mbSignInEmail)) $scope.mbErrors.email = "Valid email is required";
        if (!$scope.mbSignInPhone) $scope.mbErrors.phone = "Phone number is required";

        if (Object.keys($scope.mbErrors).length > 0) return;

        $scope.mbLoading = true;

        var authData = {
            name: $scope.mbSignInName,
            email: $scope.mbSignInEmail,
            phone: $scope.mbSignInPhone
        };

        service.SendVisitorOtpService(authData).then(function (response) {
            if (response.data.success) {
                $scope.mbOtp = [];
                $scope.mbStep = 'otp';
                mbStartCooldown();
                $scope.showToast(response.data.message, "success");
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while sending the code.", "error");
        }).finally(function () { $scope.mbLoading = false; });
    };

    $scope.mbOtpNext = function (index) {
        var val = $scope.mbOtp[index];
        if (!/^\d?$/.test(val)) { $scope.mbOtp[index] = ''; return; }
        if (val && index < 5) {
            document.getElementById('mbOtp' + (index + 1)).focus();
        }
    };

    $scope.mbVerify = function () {
        var code = $scope.mbOtp.join('');
        if (code.length < 6) {
            return $scope.showToast("Please enter the full 6-digit code.", "error");
        }

        $scope.mbOtpLoading = true;

        service.VerifyVisitorOtpService(code).then(function (response) {
            if (response.data.success) {
                $scope.showToast("Welcome back, " + response.data.name + "!", "success");
                $scope.mbShowSignIn = false;
                $scope.getMyBookings();
            } else {
                $scope.mbOtp = [];
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while verifying.", "error");
        }).finally(function () { $scope.mbOtpLoading = false; });
    };

    $scope.mbSignOut = function () {
        service.ClearVisitorSessionService().then(function () {
            $scope.mbVerified = false;
            $scope.mbBookings = [];
            $scope.mbName = '';
            $scope.mbEmail = '';
            $scope.mbShowSignIn = false;
            $scope.mbStep = 'form';
            $scope.mbSignInName = '';
            $scope.mbSignInEmail = '';
            $scope.mbSignInPhone = '';
            $scope.mbOtp = [];
        });
    };

    // ---- Cancel ----------------------------------------------------

    $scope.mbOpenCancel = function (booking) {
        $scope.mbCancelTarget = booking.id;
        $scope.mbCancelReason = '';
        $scope.mbCustomReason = '';
    };

    $scope.mbCloseCancel = function () {
        $scope.mbCancelTarget = null;
        $scope.mbCancelReason = '';
        $scope.mbCustomReason = '';
    };

    $scope.mbSetCancelReason = function (reason) {
        $scope.mbCancelReason = reason;
        if (reason !== 'Other') $scope.mbCustomReason = '';
    };

    $scope.mbConfirmCancel = function () {
        var finalReason = ($scope.mbCancelReason === 'Other')
            ? ($scope.mbCustomReason || '').trim()
            : $scope.mbCancelReason;

        if (!finalReason) {
            return $scope.showToast("Please select or enter a reason for cancellation.", "error");
        }

        $scope.mbCancelLoading = true;

        service.CancelMyBookingService($scope.mbCancelTarget, finalReason).then(function (response) {
            if (response.data.success) {
                $scope.showToast(response.data.message, "success");
                $scope.mbCloseCancel();
                $scope.getMyBookings();
            } else {
                $scope.showToast(response.data.message, "error");
            }
        }, function (error) {
            $scope.showToast("Server error occurred while cancelling.", "error");
        }).finally(function () { $scope.mbCancelLoading = false; });
    };

    // ---- Navigation ------------------------------------------------

    $scope.mbViewUnit = function (uid) {
        $scope.goToUnit(uid);
    };
    // ==========================================
    // 18. VISITOR SESSION (RENTERS HEADER)
    // ==========================================
    $scope.visitorName = '';

    $scope.loadVisitor = function () {
        service.GetVisitorSessionService().then(function (response) {
            $scope.visitorName = response.data.verified ? response.data.name : '';
        });
    };

    $scope.logoutVisitor = function () {
        service.ClearVisitorSessionService().then(function () {
            $scope.visitorName = '';
            window.location.reload();
        });
    };
    
});