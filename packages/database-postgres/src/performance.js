class PerformanceHelper {
  doTime(name) {
    /** @type {string} */
    this.traceName = name;
    this.uptime = process.uptime();
  }

  /**
   * @param {boolean} zoomAware
   * @return {undefined}
   */
  doEndtime(zoomAware) {
    var uptime = process.uptime();
    console.log(this.traceName + " cost " + (uptime - this.uptime) + " s");
    if (zoomAware) {
      this.uptime = uptime;
    }
  }
    /**
     * @param {string} no
     * @return {undefined}
   */
  doRestartTime(no) {
    this.doEndtime(true);
    /** @type {string} */
    this.traceName = no;
  };

  get time() {
    return this.isEnabled ? this.doTime : function(canCreateDiscussions) {
    };
  }

  get endTime() {
    return this.isEnabled ? this.doEndtime : function(zoomAware) {
    };
  }

  get restartTime() {
    return this.isEnabled ? this.doRestartTime : function(canCreateDiscussions) {
    };
  }

  get enabled() {
    return this.isEnabled;
  }
  set enabled(value) {
    /** @type {boolean} */
    this.isEnabled = value;
  }
}

class Utils {
  static get Performace() {
    return Utils._performance;
  }
};

Utils._performance = new PerformanceHelper;

module.exports = {
  Utils,
};
