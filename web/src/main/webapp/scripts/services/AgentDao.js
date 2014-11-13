'use strict';

pinpointApp.constant('agentDaoConfig', {
    agentStatUrl: '/getAgentStat.pinpoint'
});

pinpointApp.service('AgentDao', [ 'agentDaoConfig',
    function AgentDao(cfg) {

        this.getAgentStat = function (query, cb) {
            jQuery.ajax({
                type: 'GET',
                url: cfg.agentStatUrl,
                cache: false,
                dataType: 'json',
                data: query,
                success: function (result) {
                    if (angular.isFunction(cb)) {
                        cb(null, result);
                    }
                },
                error: function (xhr, status, error) {
                    if (angular.isFunction(cb)) {
                        cb(error, {});
                    }
                }
            });
        };

        /**
         * calculate a sampling rate based on the given period
         * @param period in minutes
         */
        this.getSampleRate = function (period) {
            var MAX_POINTS = 100;
            var points = period / 5;
            var rate = Math.floor(points / MAX_POINTS);
            return points <= MAX_POINTS ? 1 : rate;
        };

        /**
         * parse memory chart data for amcharts
         * @param info
         * @param agentStat
         * @returns {Array}
         */
        this.parseMemoryChartDataForAmcharts = function (info, agentStat) {
            var newData = [],
                pointsTime = agentStat.charts['JVM_GC_OLD_TIME'].points,
                pointsCount = agentStat.charts['JVM_GC_OLD_COUNT'].points;

            if (pointsTime.length !== pointsCount.length) {
                throw new Error('assertion error', 'time.length != count.length');
                return;
            }

            var currTime, currCount, prevTime, prevCount; // for gc

            for (var i = pointsCount.length - 1; i >= 0; --i) {
                var thisData = {
                    time: new Date(pointsTime[i].timestamp).toString('yyyy-MM-dd HH:mm'),
                    Used: 0,
                    Max: 0,
                    GC: 0
                };
                for (var k in info.line) {
                    if (info.line[k].isFgc) {
                        var GC = 0;
                        currTime = pointsTime[i].maxVal;
                        currCount = pointsCount[i].maxVal;
                        if (!prevTime || !prevCount) {
                            prevTime = currTime;
                            prevCount = currCount;
                        } else {
                            if ((currCount - prevCount > 0) && (currTime - prevTime > 0)) {
                                GC = currTime - prevTime;
                                prevTime = currTime;
                                prevCount = currCount;
                            }
                        }
                        thisData[info.line[k].key] = GC;
                    } else {
                        thisData[info.line[k].key] = agentStat.charts[info.line[k].id].points[i].maxVal;
                    }

                }

                newData.push(thisData);
            }

            return newData;
        };

        /**
         * parse cpuLoad chart data for amcharts
         * @param cpuLoad
         * @param agentStat
         * @returns {Array}
         */
        this.parseCpuLoadChartDataForAmcharts = function (cpuLoad, agentStat) {
        	// Cpu Load data availability check
        	var jvmCpuLoadData = agentStat.charts['CPU_LOAD_JVM'];
        	var systemCpuLoadData = agentStat.charts['CPU_LOAD_SYSTEM'];
        	if (jvmCpuLoadData || systemCpuLoadData) {
        		cpuLoad.isAvailable = true;
        	} else {
        		return;
        	}
            var newData = [],
            DATA_UNAVAILABLE = -1,
            pointsJvmCpuLoad = jvmCpuLoadData.points,
            pointsSystemCpuLoad = systemCpuLoadData.points;

	        if (pointsJvmCpuLoad.length !== pointsSystemCpuLoad.length) {
	            throw new Error('assertion error', 'jvmCpuLoad.length != systemCpuLoad.length');
	            return;
	        }
	        
	        /**
	         * Returns 0 if cpu load data is unavailable.
	         * @param cpuLoad
	         * @returns 0 for unavailable cpu load data, cpuLoad otherwise.
	         */
	        var processCpuLoadValue = function(cpuLoad) {
	        	if (cpuLoad < 0) {
	        		return 0;
	        	}
	        	return cpuLoad;
	        }
	        
	        /**
	         * Returns 'N/A' for unavailable cpu load data (negative value). Otherwise, round cpuLoad to 2 decimal places and return.
	         * @param cpuLoad
	         * @returns 'N/A' for unavailable cpu load data, positive double to 2 decimal places otherwise.
	         */
	        var processCpuLoadValueText = function(cpuLoad) {
	        	if (cpuLoad < 0) {
	        		return "N/A";
	        	}
	        	return cpuLoad+"%";
	        }
	
	        for (var i = pointsJvmCpuLoad.length - 1; i >= 0; --i) {
	        	if (pointsJvmCpuLoad[i].timestamp !== pointsSystemCpuLoad[i].timestamp) {
	        		throw new Error('assertion error', 'timestamp mismatch between jvmCpuLoad and systemCpuLoad');
	        		return;
	        	}
	            var thisData = {
	                time: new Date(pointsJvmCpuLoad[i].timestamp).toString('yyyy-MM-dd HH:mm'),
	                jvmCpuLoadValue: -1 * Number.MIN_VALUE,
	                jvmCpuLoadValueText: "",
	                systemCpuLoadValue: -1 * Number.MIN_VALUE,
	                systemCpuLoadValueText: "",
	                maxCpuLoad: 100
	            };
	            var jvmCpuLoad = agentStat.charts['CPU_LOAD_JVM'].points[i].maxVal.toFixed(2);
	            var systemCpuLoad = agentStat.charts['CPU_LOAD_SYSTEM'].points[i].maxVal.toFixed(2);
            	thisData.jvmCpuLoadValue = processCpuLoadValue(jvmCpuLoad);
            	thisData.jvmCpuLoadValueText = processCpuLoadValueText(jvmCpuLoad);
            	thisData.systemCpuLoadValue = processCpuLoadValue(systemCpuLoad);
            	thisData.systemCpuLoadValueText = processCpuLoadValueText(systemCpuLoad);
	
	            newData.push(thisData);
	        }

	        return newData;
        };
    }

	
]);
