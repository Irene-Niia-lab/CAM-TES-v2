
import React, { useState, useEffect } from 'react';
import { Candidate } from '../types';
import { downloadAveragedReportHtml, exportToExcel } from '../utils/exportUtils';
import { BarChart3, TrendingUp, Users, Award, Calculator, Hash, FileDown, MessageSquareText, ChevronDown, ChevronUp, User, Tag, Building2, FileSpreadsheet, Edit3, Save, Trash2 } from 'lucide-react';

interface StatisticsViewProps {
  candidates: Candidate[];
  onDeleteGroup: (idCode: string) => void;
}

interface GroupData {
  idCode: string;
  name: string;
  enName: string;
  records: Candidate[];
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ candidates, onDeleteGroup }) => {
  // 存储管理员编辑后的数据（包括姓名、均分、反馈等）
  const [editedFeedbacks, setEditedFeedbacks] = useState<Record<string, string>>({});
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editedEnNames, setEditedEnNames] = useState<Record<string, string>>({});
  const [editedOrgs, setEditedOrgs] = useState<Record<string, string>>({});
  const [editedAvgScores, setEditedAvgScores] = useState<Record<string, Record<string, number>>>({});
  
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 1. 核心聚合逻辑：按 ID Code 分组
  const aggregatedData = candidates.reduce((acc, c) => {
    const group = (c.group || '').padStart(2, '0');
    const index = (c.groupIndex || '').padStart(2, '0');
    const idCode = `${group}-${index}`;
    
    if (!acc[idCode]) {
      acc[idCode] = {
        idCode,
        name: c.name || '未命名',
        enName: c.enName,
        records: []
      };
    }
    acc[idCode].name = c.name || acc[idCode].name;
    acc[idCode].enName = c.enName || acc[idCode].enName;
    acc[idCode].records.push(c);
    
    return acc;
  }, {} as Record<string, GroupData>);

  const groups = (Object.values(aggregatedData) as GroupData[]).sort((a, b) => 
    a.idCode.localeCompare(b.idCode, undefined, { numeric: true, sensitivity: 'base' })
  );

  // 2. 初始化聚合状态
  useEffect(() => {
    const initialFeedbacks: Record<string, string> = {};
    const initialNames: Record<string, string> = {};
    const initialEnNames: Record<string, string> = {};
    const initialOrgs: Record<string, string> = {};
    const initialScores: Record<string, Record<string, number>> = {};

    const criteriaIds = ["1_1", "1_2", "2_1", "2_2", "2_3", "3_1", "3_2"];

    groups.forEach(g => {
      // 提取反馈
      if (!editedFeedbacks[g.idCode]) {
        initialFeedbacks[g.idCode] = g.records
          .filter(r => r.feedback)
          .map(r => `【评委 ${r.judgeUsername || '系统'}】:\n${r.feedback}`)
          .join('\n\n---\n\n');
      }

      // 计算均分作为初始值
      if (!editedAvgScores[g.idCode]) {
        const avgScores: Record<string, number> = {};
        criteriaIds.forEach(cid => {
          const sum = g.records.reduce((s, r) => s + (r.scores[cid] || 0), 0);
          avgScores[cid] = parseFloat((sum / g.records.length).toFixed(1));
        });
        initialScores[g.idCode] = avgScores;
      }

      const lastRecord = g.records[g.records.length - 1];
      if (!editedNames[g.idCode]) initialNames[g.idCode] = lastRecord.name || '';
      if (!editedEnNames[g.idCode]) initialEnNames[g.idCode] = lastRecord.enName || '';
      
      // 优化机构名称保留逻辑：搜索所有记录，取第一个不为空的机构名称作为默认值
      if (!editedOrgs[g.idCode]) {
        const firstNonEmptyOrg = g.records.find(r => r.organization && r.organization.trim() !== '')?.organization || '';
        initialOrgs[g.idCode] = firstNonEmptyOrg;
      }
    });

    if (Object.keys(initialFeedbacks).length > 0) setEditedFeedbacks(p => ({ ...initialFeedbacks, ...p }));
    if (Object.keys(initialNames).length > 0) setEditedNames(p => ({ ...initialNames, ...p }));
    if (Object.keys(initialEnNames).length > 0) setEditedEnNames(p => ({ ...initialEnNames, ...p }));
    if (Object.keys(initialOrgs).length > 0) setEditedOrgs(p => ({ ...initialOrgs, ...p }));
    if (Object.keys(initialScores).length > 0) setEditedAvgScores(p => ({ ...initialScores, ...p }));
  }, [candidates]);

  // 计算显示用的总分
  const getAggregatedTotal = (idCode: string) => {
    const scores = editedAvgScores[idCode];
    if (!scores) return "0.0";
    const total = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);
    return total.toFixed(1);
  };

  const handleExportFinalReport = (group: GroupData) => {
    const avgScores = editedAvgScores[group.idCode];
    const avgTotal = getAggregatedTotal(group.idCode);
    const allStages = Array.from(new Set(group.records.flatMap(r => r.selectedStages || [])));

    downloadAveragedReportHtml(
      group.idCode,
      editedNames[group.idCode] || group.name,
      editedEnNames[group.idCode] || group.enName,
      editedOrgs[group.idCode] || '', // 使用编辑后的机构名
      group.records[0]?.group || '?',
      group.records[0]?.groupIndex || '?',
      group.records[0]?.category || 'PU0',
      allStages,
      avgScores,
      avgTotal,
      editedFeedbacks[group.idCode] || ''
    );
  };

  const handleDeleteClick = (idCode: string, name: string) => {
    if (window.confirm(`确定要删除识别码 [${idCode}] (${name}) 下的所有评分记录吗？\n此操作将移除该考生关联的所有评委打分记录，且不可撤销。`)) {
      onDeleteGroup(idCode);
    }
  };

  const totalJudgments = candidates.length;
  const avgSystemScore = totalJudgments > 0 
    ? (candidates.reduce((sum, c) => sum + c.totalScore, 0) / totalJudgments).toFixed(1) 
    : '0';

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">智能评分聚合分析 (汇总均分版)</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregated Analytic Center</p>
          </div>
        </div>
        
        <button onClick={() => exportToExcel(candidates)} className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 group">
          <FileSpreadsheet className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          导出全员成绩汇总表
        </button>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '原始评分次', value: totalJudgments, icon: <Users className="w-6 h-6" />, color: 'blue' },
          { label: '独立考生数', value: groups.length, icon: <Award className="w-6 h-6" />, color: 'emerald' },
          { label: '全场原始均分', value: avgSystemScore, icon: <Calculator className="w-6 h-6" />, color: 'purple' },
          { label: '聚合最高分', value: groups.length > 0 ? Math.max(...groups.map(g => parseFloat(getAggregatedTotal(g.idCode)))) : 0, icon: <TrendingUp className="w-6 h-6" />, color: 'orange' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 bg-${item.color}-50 rounded-2xl flex items-center justify-center text-${item.color}-600`}>{item.icon}</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{item.label}</p>
              <p className="text-2xl font-black text-slate-800">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 z-20">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-40">识别码</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-40">考生姓名</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">分项均分预览 (可编辑)</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right w-64">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groups.map((group) => {
                const id = group.idCode;
                const isExpanded = expandedRow === id;
                const scores = editedAvgScores[id] || {};
                
                return (
                  <React.Fragment key={id}>
                    <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-6 py-6 align-top">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl font-black text-sm border border-blue-100 shadow-sm">
                          <Hash className="w-3.5 h-3.5" /> {id}
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="flex flex-col">
                          <span className="text-base font-black text-slate-800 leading-tight">{editedNames[id] || group.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{editedEnNames[id] || group.enName || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-4">
                           <div className="flex flex-wrap gap-2">
                            {["1_1", "1_2", "2_1", "2_2", "2_3", "3_1", "3_2"].map(cid => (
                              <div key={cid} className="px-3 py-2 bg-white border border-slate-100 rounded-xl flex flex-col items-center min-w-[50px] shadow-sm">
                                <span className="text-[8px] font-black text-slate-400 uppercase mb-1">{cid.replace('_','.')}</span>
                                <span className="text-sm font-black text-slate-700">{scores[cid] || 0}</span>
                              </div>
                            ))}
                            <div className="bg-slate-900 text-white px-5 py-2 rounded-xl flex flex-col items-center min-w-[60px] shadow-lg">
                               <span className="text-[8px] font-black text-slate-400 uppercase mb-1">FINAL</span>
                               <span className="text-base font-black">{getAggregatedTotal(id)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <button onClick={() => setExpandedRow(isExpanded ? null : id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                <Edit3 className="w-4 h-4" /> {isExpanded ? '收起编辑器' : '修正详情并分析'}
                             </button>
                             <span className="text-[10px] font-bold text-slate-300 italic">由 {group.records.length} 名评委的分数聚合而成</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right align-top">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleDeleteClick(id, editedNames[id] || group.name)}
                            className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                            title="删除该识别码下所有评分"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleExportFinalReport(group)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                            <FileDown className="w-5 h-5" /> 导出报告
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50/20">
                        <td colSpan={4} className="px-8 py-8">
                          <div className="bg-white p-8 rounded-[2rem] border border-blue-100 shadow-2xl space-y-8 animate-in slide-in-from-top-4 duration-300">
                            
                            {/* 聚合分数微调区 */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-black text-blue-800 flex items-center gap-2 uppercase tracking-widest">
                                <Edit3 className="w-4 h-4" /> 聚合均分微调分析 (支持小数)
                              </h4>
                              <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                                {["1_1", "1_2", "2_1", "2_2", "2_3", "3_1", "3_2"].map(cid => (
                                  <div key={cid} className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cid.replace('_','.')} 项</label>
                                    <input 
                                      type="number"
                                      step="0.1"
                                      value={scores[cid] ?? 0}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setEditedAvgScores(p => ({...p, [id]: {...(p[id]||{}), [cid]: val}}));
                                      }}
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 font-black text-blue-600 outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                              <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">修正姓名</label>
                                <input type="text" value={editedNames[id] || ''} onChange={(e) => setEditedNames(p => ({...p, [id]: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">修正英文名</label>
                                <input type="text" value={editedEnNames[id] || ''} onChange={(e) => setEditedEnNames(p => ({...p, [id]: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">修正机构</label>
                                <input 
                                  type="text" 
                                  placeholder="未填写机构"
                                  value={editedOrgs[id] || ''} 
                                  onChange={(e) => setEditedOrgs(p => ({...p, [id]: e.target.value}))} 
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" 
                                />
                              </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-slate-50">
                               <label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                  <MessageSquareText className="w-4 h-4" />
                                  终审聚合评估反馈建议 (合并多个评委意见)
                                </label>
                                <textarea 
                                  value={editedFeedbacks[id] || ''}
                                  onChange={(e) => setEditedFeedbacks(p => ({...p, [id]: e.target.value}))}
                                  className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-100 transition-all outline-none leading-relaxed text-sm font-medium text-slate-700"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                               <button onClick={() => setExpandedRow(null)} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                                  <Save className="w-5 h-5" /> 完成并应用修正
                               </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
