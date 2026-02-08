// src/pages/HomePage.jsx
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import "../styles/HomePage.css";
import api from "../services/api";
import "../styles/layout.css";

// =======================
//   IMPORT RECHARTS
// =======================
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from "recharts";

/* ---------------------------
   Small helper components / funcs
   --------------------------- */
function LegendNote({ color, label }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: color }} />
      <div style={{ fontSize: 13, color: "#333" }}>{label}</div>
    </div>
  );
}

// shade color helper (returns lighter/darker variant)
// amount between -1 and 1: negative => darker, positive => lighter
function shadeColor(hex, amount) {
  // convert hex to rgb
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) + Math.round(255 * amount);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * amount);
  let b = (num & 0x0000ff) + Math.round(255 * amount);
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  const rr = r.toString(16).padStart(2, "0");
  const gg = g.toString(16).padStart(2, "0");
  const bb = b.toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function HomePage() {
  const [activeTab, setActiveTab] = useState("chis0");

  // FILTER STATE (for "Chỉ số" tab)
  const [filterType, setFilterType] = useState("all");
  const [month, setMonth] = useState("1");
  const [quarter, setQuarter] = useState("1");
  const [year, setYear] = useState(new Date().getFullYear());

  

  // DATA STATES
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [stats, setStats] = useState(null); // dữ liệu CHỈ SỐ theo bộ lọc

  // Chart (global/all) data
  const [statsChart, setStatsChart] = useState(null); // dữ liệu BIỂU ĐỒ luôn ALL

  // Comparison (growth) states
  const [compareType, setCompareType] = useState("month"); // "month" | "quarter" | "year"
  const [a_month, setA_Month] = useState("1");
  const [a_quarter, setA_Quarter] = useState("1");
  const [a_year, setA_Year] = useState(new Date().getFullYear());
  const [b_month, setB_Month] = useState("1");
  const [b_quarter, setB_Quarter] = useState("1");
  const [b_year, setB_Year] = useState(new Date().getFullYear() - 1);

  const [statsA, setStatsA] = useState(null);
  const [statsB, setStatsB] = useState(null);

  // Hover state for Bar tooltip (so tooltip shows only the hovered bar)
  const [hoveredBar, setHoveredBar] = useState(null); // {series:'A'|'B', index}

  // COLORS (one color per metric)
  const metricColors = {
    enroll: "#4f8ef7", // blue
    graduate: "#34c759", // green
    fail: "#ff4d4f", // red
    quit: "#ffb84d" // amber
  };

  // -------------------------
  //  HELPERS: range from select
  // -------------------------
  const getRangeFrom = (type, monthVal, quarterVal, yearVal) => {
    // monthVal, quarterVal, yearVal are strings or numbers
    const y = Number(yearVal);
    if (type === "month") {
      const m = String(monthVal).padStart(2, "0");
      const start = `${y}-${m}-01`;
      const endDate = new Date(y, Number(m), 0).getDate();
      const end = `${y}-${m}-${String(endDate).padStart(2, "0")}`;
      return { start, end };
    }
    if (type === "quarter") {
      const q = Number(quarterVal);
      const qStart = (q - 1) * 3 + 1;
      const qEnd = qStart + 2;
      const start = `${y}-${String(qStart).padStart(2, "0")}-01`;
      const endDay = new Date(y, qEnd, 0).getDate();
      const end = `${y}-${String(qEnd).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      return { start, end };
    }
    // year
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  };

  // -------------------------
  //  TÍNH START - END DATE (Cho tab Chỉ số)
  // -------------------------
  const calculateRange = () => {
    let start = "";
    let end = "";

    if (filterType === "month") {
      start = `${year}-${month.padStart(2, "0")}-01`;
      end = `${year}-${month.padStart(2, "0")}-${new Date(year, Number(month), 0).getDate()}`;
    } else if (filterType === "quarter") {
      const qStart = (quarter - 1) * 3 + 1;
      const qEnd = qStart + 2;
      start = `${year}-${String(qStart).padStart(2, "0")}-01`;
      end = `${year}-${String(qEnd).padStart(2, "0")}-${new Date(year, qEnd, 0).getDate()}`;
    } else if (filterType === "year") {
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    } else if (filterType === "all") {
      start = "1900-01-01";
      end = "2100-12-31";
    }

    setDateRange({ start, end });
  };

  useEffect(() => {
    calculateRange();
  }, [filterType, month, quarter, year]);

  // -------------------------
  //      API: CHỈ SỐ (THEO LỌC)
  // -------------------------
  const fetchDashboard = async () => {
    try {
      const url = `/dashboard?start=${dateRange.start}&end=${dateRange.end}`;
      const res = await api.get(url);
      setStats(res.data);
    } catch (err) {
      console.error("Dashboard API Error:", err);
    }
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // -------------------------
  //      API: BIỂU ĐỒ (ALL) - gọi 1 lần
  // -------------------------
  const fetchChartData = async () => {
    try {
      const url = `/dashboard?start=1900-01-01&end=2100-12-31`;
      const res = await api.get(url);
      setStatsChart(res.data);
    } catch (err) {
      console.error("Chart API Error:", err);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  // -------------------------
  //      API: SO SÁNH (2 kỳ) - gọi khi user bấm Compare
  // -------------------------
  const fetchCompare = async () => {
    try {
      const rA = getRangeFrom(compareType, a_month, a_quarter, a_year);
      const rB = getRangeFrom(compareType, b_month, b_quarter, b_year);
      const token = localStorage.getItem("token");

      const [resA, resB] = await Promise.all([
        api.get(`/dashboard?start=${rA.start}&end=${rA.end}`),
        api.get(`/dashboard?start=${rB.start}&end=${rB.end}`),
      ]);

      setStatsA(resA.data);
      setStatsB(resB.data);
    } catch (err) {
      console.error("Compare API Error:", err);
    }
  };

  // call initial compare defaults (current month vs previous month)
  useEffect(() => {
    // set default B to previous month if compareType is month
    if (compareType === "month") {
      const now = new Date();
      setA_Month(String(now.getMonth() + 1));
      setA_Year(String(now.getFullYear()));
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setB_Month(String(prev.getMonth() + 1));
      setB_Year(String(prev.getFullYear()));
    } else if (compareType === "year") {
      setA_Year(String(new Date().getFullYear()));
      setB_Year(String(new Date().getFullYear() - 1));
    } else if (compareType === "quarter") {
      // default Q: current quarter vs previous quarter
      const now = new Date();
      const curQ = Math.floor(now.getMonth() / 3) + 1;
      setA_Quarter(String(curQ));
      setA_Year(String(now.getFullYear()));
      let prevQ = curQ - 1;
      let prevY = now.getFullYear();
      if (prevQ === 0) {
        prevQ = 4;
        prevY -= 1;
      }
      setB_Quarter(String(prevQ));
      setB_Year(String(prevY));
    }
    // fetch compare once default set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareType]);

  // fetch compare whenever user changes A/B or compareType
  useEffect(() => {
    fetchCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareType, a_month, a_quarter, a_year, b_month, b_quarter, b_year]);

  // -------------------------
  //  PREPARE DATA FOR CHARTS
  // -------------------------
  // Simple bar chart for "Biểu đồ" tab (one bar per metric, each metric a different color)
  const barSingleData = [
    { name: "Nhập học", key: "enroll", value: statsChart?.totalEnroll || 0 },
    { name: "Tốt nghiệp", key: "graduate", value: statsChart?.totalGraduate || 0 },
    { name: "Trượt", key: "fail", value: statsChart?.totalFail || 0 },
    { name: "Dừng thực tập", key: "quit", value: statsChart?.totalQuit || 0 }
  ];

  // Data for comparison charts (A vs B)
  const compareMetrics = [
    { name: "Nhập học", key: "totalEnroll", color: metricColors.enroll },
    { name: "Tốt nghiệp", key: "totalGraduate", color: metricColors.graduate },
    { name: "Trượt", key: "totalFail", color: metricColors.fail },
    { name: "Dừng thực tập", key: "totalQuit", color: metricColors.quit },
    { name: "Tỉ lệ đỗ (%)", key: "passFailRate", color: "#6f42c1" },
    { name: "Điểm TB", key: "averageFinalScore", color: "#20c997" }
  ];

  const compareDataForCharts = compareMetrics.map((m, i) => {
    const aVal = statsA ? (m.key === "passFailRate" ? (statsA.passFailRate ?? 0) : (statsA[m.key] ?? 0)) : 0;
    const bVal = statsB ? (m.key === "passFailRate" ? (statsB.passFailRate ?? 0) : (statsB[m.key] ?? 0)) : 0;
    return {
      metric: m.name,
      key: m.key,
      A: Number(aVal),
      B: Number(bVal),
      color: m.color
    };
  });

  // compute growth array
  const growthResults = compareDataForCharts.map((d) => {
    const a = d.A;
    const b = d.B;
    let diff = 0;
    let pct = 0;
    if (b === 0) {
      diff = a - b;
      pct = b === 0 ? (a === 0 ? 0 : 100) : ((diff / b) * 100);
    } else {
      diff = a - b;
      pct = (diff / b) * 100;
    }
    return {
      metric: d.metric,
      a,
      b,
      diff,
      pct
    };
  });

  // -------------------------
  //  CUSTOM TOOLTIP for single-bar hover
  // -------------------------
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !hoveredBar) return null;
    const { series, index } = hoveredBar;
    // find data item
    const item = barGroupedData[index];
    if (!item) return null;
    const value = series === "A" ? item.A : item.B;
    const labelText = item.metric;
    return (
      <div style={{
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: 8,
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
      }}>
        <div style={{ fontSize: 13, color: "#666" }}>{labelText}</div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>{value}</div>
      </div>
    );
  };

  // Data structure for grouped bar (metrics as x-axis, two bars A & B)
  const barGroupedData = compareDataForCharts.map((d) => ({
    metric: d.metric,
    A: d.A,
    B: d.B,
    color: d.color
  }));

  // Radar data expects array of {subject, A, B}
  const radarData = compareDataForCharts.map((d) => ({
    subject: d.metric,
    A: d.A,
    B: d.B
  }));

  // Line chart data: same as grouped - map metrics to point
  const lineData = compareDataForCharts.map((d) => ({
    metric: d.metric,
    A: d.A,
    B: d.B
  }));

  // small helper to format percent with sign
  const formatPercent = (v) => {
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
  };

  // -------------------------
  //  RENDER
  // -------------------------
  return (
    <Layout>
      <div className="home-container fade-slide">

        {/* TABS */}
        <div className="tabs">
          <button className={activeTab === "chis0" ? "tab active" : "tab"} onClick={() => setActiveTab("chis0")}>Chỉ số</button>
          <button className={activeTab === "bieu-do" ? "tab active" : "tab"} onClick={() => setActiveTab("bieu-do")}>Biểu đồ</button>
          <button className={activeTab === "tang-truong" ? "tab active" : "tab"} onClick={() => setActiveTab("tang-truong")}>Thống kê tăng trưởng</button>
        </div>

        {/* ========== TAB CHỈ SỐ ========== */}
        {activeTab === "chis0" && (
          <>
            <div className="header-row">
              <h2 className="title">Kết quả đào tạo</h2>
            </div>

            {/* FILTER */}
            <div className="filter-buttons">
              <button className={filterType === "month" ? "f-btn active" : "f-btn"} onClick={() => setFilterType("month")}>Tháng</button>
              <button className={filterType === "quarter" ? "f-btn active" : "f-btn"} onClick={() => setFilterType("quarter")}>Quý</button>
              <button className={filterType === "year" ? "f-btn active" : "f-btn"} onClick={() => setFilterType("year")}>Năm</button>
              <button className={filterType === "all" ? "f-btn active" : "f-btn"} onClick={() => setFilterType("all")}>Tất cả</button>
            </div>

            <div className="selectors">
              {filterType === "month" && (
                <select className="select-control" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                </select>
              )}
              {filterType === "quarter" && (
                <select className="select-control" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                  <option value="1">Quý 1</option>
                  <option value="2">Quý 2</option>
                  <option value="3">Quý 3</option>
                  <option value="4">Quý 4</option>
                </select>
              )}
              {filterType !== "all" && (
                <select className="select-control" value={year} onChange={(e) => setYear(e.target.value)}>
                  {Array.from({ length: 16 }, (_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>Năm {y}</option>;
                  })}
                </select>
              )}
            </div>

            <div className="stats-grid">
              <div className="card">Số thực tập sinh nhập học: {stats?.totalEnroll ?? 0}</div>
              <div className="card">Số thực tập sinh tốt nghiệp: {stats?.totalGraduate ?? 0}</div>
              <div className="card">Số thực tập sinh trượt: {stats?.totalFail ?? 0}</div>
              <div className="card">Tỉ lệ đỗ: {stats?.passFailRateStr ?? 0}</div>
              <div className="card">Số thực tập sinh dừng thực tập: {stats?.totalQuit ?? 0}</div>
              <div className="card">Điểm tốt nghiệp trung bình: {stats?.averageFinalScore ?? 0}</div>
            </div>
          </>
        )}

        {/* ========== TAB BIỂU ĐỒ ========== */}
        {activeTab === "bieu-do" && (
          <div className="charts-container">
            <h2 className="title">Biểu đồ thống kê</h2>

            {/* single colorful bar chart (each metric one color) */}
            <div className="chart-box" style={{ marginBottom: 8 }}>
              <h3 style={{ marginBottom: 10 }}>Số lượng thực tập sinh toàn khoá</h3>

              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barSingleData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 13 }} />
                  <YAxis />
                  <Tooltip />
                  {/* we use a single Bar and Cells for different color per bar */}
                  <Bar dataKey="value">
                    {barSingleData.map((entry, index) => {
                      const key = entry.key;
                      const fill = key === "enroll" ? metricColors.enroll :
                                   key === "graduate" ? metricColors.graduate :
                                   key === "fail" ? metricColors.fail :
                                   metricColors.quit;
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* legend / notes below with color swatches */}
              <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                <LegendNote color={metricColors.enroll} label={`Nhập học: ${barSingleData[0].value}`} />
                <LegendNote color={metricColors.graduate} label={`Tốt nghiệp: ${barSingleData[1].value}`} />
                <LegendNote color={metricColors.fail} label={`Trượt: ${barSingleData[2].value}`} />
                <LegendNote color={metricColors.quit} label={`Dừng thực tập: ${barSingleData[3].value}`} />
              </div>
            </div>

          </div>
        )}

       {/* ========== TAB TĂNG TRƯỞNG ========== */}
{activeTab === "tang-truong" && (
  <div className="charts-container">
    <h2 className="title">Thống kê tăng trưởng</h2>

    {/* --- Chọn loại thống kê --- */}
    <div className="filter-buttons">
      <button className={compareType === "month" ? "f-btn active" : "f-btn"} onClick={() => setCompareType("month")}>Tháng</button>
      <button className={compareType === "quarter" ? "f-btn active" : "f-btn"} onClick={() => setCompareType("quarter")}>Quý</button>
      <button className={compareType === "year" ? "f-btn active" : "f-btn"} onClick={() => setCompareType("year")}>Năm</button>
    </div>

    {/* --- Chọn năm (trừ mode Năm) --- */}
    {compareType !== "year" && (
      <div style={{ marginTop: 10 }}>
        <select className="select-control" value={a_year} onChange={(e) => setA_Year(e.target.value)}>
          {Array.from({ length: 16 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>Năm {y}</option>;
          })}
        </select>
      </div>
    )}

    {/* --- Tải dữ liệu biểu đồ --- */}
    <GrowthChart
      mode={compareType}
      year={a_year}
    />
  </div>
)}


      </div>
    </Layout>
  );
  function GrowthChart({ mode, year }) {
  const [data, setData] = React.useState([]);

  // helper build range
  const buildRange = (y, m1, m2) => {
    const start = `${y}-${String(m1).padStart(2, "0")}-01`;
    const endDay = new Date(y, m2, 0).getDate();
    const end = `${y}-${String(m2).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    return { start, end };
  };

  const fetchData = async () => {

    let items = [];

    if (mode === "month") {
      // 12 tháng trong 1 năm
      for (let m = 1; m <= 12; m++) {
        const range = buildRange(year, m, m);
        const url = `/dashboard?start=${range.start}&end=${range.end}`;
        const res = await api.get(url);
        items.push({
          label: `T${m}`,
          enroll: res.data.totalEnroll ?? 0,
          grad: res.data.totalGraduate ?? 0,
          fail: res.data.totalFail ?? 0,
          quit: res.data.totalQuit ?? 0,
          
        });
      }
    }

    if (mode === "quarter") {
      // 4 quý trong 1 năm
      const ranges = [
        buildRange(year, 1, 3),
        buildRange(year, 4, 6),
        buildRange(year, 7, 9),
        buildRange(year, 10, 12),
      ];

      for (let i = 0; i < 4; i++) {
        const res = await api.get(
          `/dashboard?start=${ranges[i].start}&end=${ranges[i].end}`
        );
        items.push({
          label: `Q${i + 1}`,
          enroll: res.data.totalEnroll ?? 0,
          grad: res.data.totalGraduate ?? 0,
          fail: res.data.totalFail ?? 0,
          quit: res.data.totalQuit ?? 0,
          
        });
      }
    }

    if (mode === "year") {
      // Lấy danh sách năm có dữ liệu
      let startYear = 2010;
      let endYear = new Date().getFullYear();

      for (let y = startYear; y <= endYear; y++) {
        const range = buildRange(y, 1, 12);
        const url = `/dashboard?start=${range.start}&end=${range.end}`;
        const res = await api.get(url);
        items.push({
          label: `${y}`,
          enroll: res.data.totalEnroll ?? 0,
          grad: res.data.totalGraduate ?? 0,
          fail: res.data.totalFail ?? 0,
          quit: res.data.totalQuit ?? 0,
          
        });
      }
    }

    setData(items);
  };

  React.useEffect(() => {
    fetchData();
  }, [mode, year]);

  return (
    <div className="chart-box" style={{ marginTop: 20 }}>
      <h3>Đồ thị tăng trưởng</h3>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />

          <Legend />

          <Line type="monotone" dataKey="enroll" name="Nhập học" stroke="#4f8ef7" strokeWidth={2} />
          <Line type="monotone" dataKey="grad" name="Tốt nghiệp" stroke="#34c759" strokeWidth={2} />
          <Line type="monotone" dataKey="fail" name="Trượt" stroke="#ff4d4f" strokeWidth={2} />
          <Line type="monotone" dataKey="quit" name="Dừng thực tập" stroke="#ffb84d" strokeWidth={2} />
          
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

}
export default HomePage;
