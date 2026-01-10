"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, addDoc, query, where, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp, getDocs 
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit3, Plus, ExternalLink, BookOpen, Video, Globe } from "lucide-react";

export const TeacherLinkManager = ({ teacherId }: { teacherId: string }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [newLink, setNewLink] = useState({ title: "", url: "", type: "classroom", targetGrade: "all" });
  const [editingId, setEditingId] = useState<string | null>(null);

  /* -----------------------------------------------------------
     1. FETCH DYNAMIC GRADES FROM REGISTERED STUDENTS
  ----------------------------------------------------------- */
  useEffect(() => {
    const fetchGrades = async () => {
      const studentSnap = await getDocs(collection(db, "students"));
      const grades = new Set<string>();
      studentSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.grade) grades.add(data.grade);
      });
      // Sort grades numerically/alphabetically
      setAvailableGrades(Array.from(grades).sort());
    };
    fetchGrades();
  }, []);

  /* -----------------------------------------------------------
     2. REAL-TIME LINK SYNC (Filtered by Teacher)
  ----------------------------------------------------------- */
  useEffect(() => {
    // Show the teacher all links they have created, regardless of grade
    const q = query(collection(db, "class_links"), where("teacherId", "==", teacherId));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedLinks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter locally if teacher wants to view specific grade in their list
      if (selectedGrade === "all") {
        setLinks(fetchedLinks);
      } else {
        setLinks(fetchedLinks.filter(l => l.grade === selectedGrade));
      }
    });
    return () => unsub();
  }, [teacherId, selectedGrade]);

  /* -----------------------------------------------------------
     3. SAVE / UPDATE LOGIC
  ----------------------------------------------------------- */
  const handleSaveLink = async () => {
    if (!newLink.title || !newLink.url) return;

    const linkData = {
      title: newLink.title,
      url: newLink.url,
      type: newLink.type,
      grade: newLink.targetGrade, // "all" or specific grade like "Grade 1"
      teacherId,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "class_links", editingId), linkData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "class_links"), {
          ...linkData,
          createdAt: serverTimestamp()
        });
      }
      setNewLink({ ...newLink, title: "", url: "" });
    } catch (err) {
      console.error("Error saving link:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this link? It will be removed from student dashboards immediately.")) {
      await deleteDoc(doc(db, "class_links", id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 tracking-tight">CLASSROOM LINK ENGINE</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Viewing Grade:</span>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[150px] h-8 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All My Links</SelectItem>
              {availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[2rem]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Target Grade</label>
              <Select value={newLink.targetGrade} onValueChange={v => setNewLink({...newLink, targetGrade: v})}>
                <SelectTrigger className="bg-white/10 border-none text-white font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Send to All Grades</SelectItem>
                  {availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Link Title</label>
              <Input className="bg-white/10 border-none text-white placeholder:text-white/40" placeholder="e.g. Zoom Room" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-bold uppercase opacity-80">URL</label>
              <Input className="bg-white/10 border-none text-white placeholder:text-white/40" placeholder="https://..." value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Type</label>
              <Select value={newLink.type} onValueChange={v => setNewLink({...newLink, type: v})}>
                <SelectTrigger className="bg-white/10 border-none text-white font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom/Video</SelectItem>
                  <SelectItem value="resource">Resource Material</SelectItem>
                  <SelectItem value="extra">Extra Reading</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveLink} className="w-full bg-white text-indigo-600 hover:bg-white/90 font-black">
              {editingId ? "UPDATE" : "PUBLISH"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DISPLAY LINKS */}
      <div className="grid gap-3">
        {links.length > 0 ? links.map(link => (
          <div key={link.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${link.type === 'classroom' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {link.type === 'classroom' ? <Video size={18}/> : <BookOpen size={18}/>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{link.title}</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-black uppercase">
                    {link.grade === 'all' ? <Globe size={10} className="inline mr-1"/> : null}
                    {link.grade}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">{link.url}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingId(link.id); setNewLink({ title: link.title, url: link.url, type: link.type, targetGrade: link.grade }); }}>
                <Edit3 size={14}/>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(link.id)}>
                <Trash2 size={14}/>
              </Button>
            </div>
          </div>
        )) : (
            <div className="text-center py-10 border-2 border-dashed rounded-3xl text-slate-400 italic text-sm">
                No links published for this selection.
            </div>
        )}
      </div>
    </div>
  );
};