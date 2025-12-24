
import React, { useState, useRef } from 'react';
import { Judge, SyncConfig, Candidate, TeachingCategory } from '../types';
import { SyncService } from '../services/syncService';
import * as XLSX from 'xlsx';
import { UserPlus, Trash2, Users, ShieldCheck, Calendar, X, Cloud, Key, Globe, CheckCircle, FileUp, AlertCircle, Info } from 'lucide-react';

interface AdminPanelProps {
  judges: Judge[];
  onAddJudge: (judge: Omit<Judge, 'id' | 'createdAt'>) => void;
  onDeleteJudge: (id: string) => void;
  onClose: () => void;
  syncConfig: SyncConfig;
  setSyncConfig: (cfg: SyncConfig) => void;
  candidates: Candidate[];
  onImportCandidates: (newCandidates: Candidate[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  judges, onAddJudge, onDeleteJudge, onClose, syncConfig, setSyncConfig, candidates, onImportCandidates 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSync = async () => {
    setLoading(true);
    const token = await SyncService.createSyncSession({
      candidates,
      judges,
      version: Date.now()
    });
    setSyncConfig({ ...syncConfig, enabled: true, token });
    setLoading(false);
  };

  const handleJoinSync = () => {
    if (inputToken.length < 5) return alert("请输入有效的同步 Token");
    setSyncConfig({ ...syncConfig, enabled: true, token: inputToken });
    alert("已成功加入同步组，请点击侧边栏刷新按钮同步数据");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const imported = jsonData.map((row, index) => {
          // 尝试从识别码解析组号和序号 (格式 01-01)
          const idParts = (row["识别码"] || "").split('-');
          const group = idParts[0] || row["小组"] || "";
          const groupIndex = idParts[1] || row["组内编号"] || "";

          const scores: Record<string, number> = {
            "1_1": parseFloat(row["1.1 得分"]) || 0,
            "1_2": parseFloat(row["1.2 得分"]) || 0,
            "2_1": parseFloat(row["2.1 得分"]) || 0,
            "2_2": parseFloat(row["2.2 得分"]) || 0,
            "2_3": parseFloat(row["2.3 得分"]) || 0,
            "3_1": parseFloat(row["3.1 得分"]) || 0,
            "3_2": parseFloat(row["3.2 得分"]) || 0,
          };

          return {
            id: `import-${Date.now()}-${index}`,
            name: row["姓名"] || "",
            enName: row["英文名"] || "",
            group,
            groupIndex,
            organization: row["机构"] || "",
            category: row["考核类别"] === "PU1" ? TeachingCategory.PU1 : TeachingCategory.PU0,
            selectedStages: (row["已选教学环节"] || "").split(',').map((s: string) => s.trim()).filter(Boolean),
            scores,
            feedback: row["反馈意见"] || "",
            totalScore: parseFloat(row["总分"]) || Object.values(scores).reduce((a, b) => a + b, 0),
            lastUpdated: new Date().toLocaleString(),
            judgeUsername: row["评委"] || "Excel导入"
          };
        });

        if (imported.length > 0) {
          onImportCandidates(imported);
          alert(`成功导入 ${imported.length} 条评分记录！系统已按识别码自动合并均分。`);
        }
      } catch (err) {
        console.error(err);
        alert("导入失败，请确保 Excel 格式符合系统模板。");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">系统管理与分析版本配置</h2>
            <p className="text-slate-400 font-medium text-sm">管理员权限：支持 Excel 批量导入数据进行汇总分析</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 数据导入中心 - 分析版核心 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-indigo-600" />
              Excel 批量数据导入分析
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Import Hub</span>
          </div>

          <div className="space-y-6">
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center text-center group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8 text-indigo-500" />
              </div>
              <h4 className="text-lg font-black text-slate-800">上传原始成绩单</h4>
              <p className="text-sm text-slate-400 font-medium mt-1 max-w-[240px]">
                支持上传由本系统导出的汇总表，或包含“识别码”的标准 Excel 表格
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="flex gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-bold leading-relaxed">
                提示：导入新数据不会覆盖现有记录。如果存在相同的“识别码”，系统会在“成绩汇总统计”页面自动计算这些记录的均分，方便生成最终汇总报告。
              </p>
            </div>
          </div>
        </div>

        {/* 数据云同步配置 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              多端评分同步状态
            </h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${syncConfig.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {syncConfig.enabled ? 'Cloud Enabled' : 'Local Mode'}
            </div>
          </div>

          {!syncConfig.enabled ? (
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
               <button 
                onClick={handleCreateSync}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Cloud className="w-5 h-5" />}
                创建云同步组
              </button>
              <div className="flex gap-2 mt-4">
                <input 
                  type="text" 
                  placeholder="加入现有 Token"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="flex-1 px-5 py-3 bg-white border border-blue-200 rounded-2xl outline-none font-bold text-blue-800 focus:ring-4 focus:ring-blue-100"
                />
                <button onClick={handleJoinSync} className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl font-black hover:bg-blue-50 transition-all">加入</button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
              <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-emerald-200 mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">您的同步码</span>
                <span className="text-3xl font-black text-slate-800 tracking-wider font-mono">{syncConfig.token}</span>
              </div>
              <button onClick={() => setSyncConfig({...syncConfig, enabled: false})} className="text-xs font-bold text-red-500">停用同步</button>
            </div>
          )}
        </div>

        {/* 评委账号管理 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px] lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            系统评委账户列表
          </h3>
          <div className="flex gap-4 mb-6">
             <input type="text" placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold" />
             <input type="text" placeholder="账号" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold" />
             <input type="text" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold" />
             <button onClick={() => { if(name&&username&&password) { onAddJudge({name,username,password}); setName(''); setUsername(''); setPassword(''); } }} className="px-6 bg-slate-900 text-white rounded-xl font-black hover:bg-blue-600 transition-all">+</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50">
                <tr><th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">评委信息</th><th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">操作</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {judges.map(j => (
                  <tr key={j.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><span className="font-black text-slate-700">{j.name}</span><span className="ml-3 text-[10px] font-mono text-slate-400">@{j.username}</span></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => onDeleteJudge(j.id)} className="p-2 text-slate-200 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
