"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, addDoc, query, where, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit3, Plus, ExternalLink, BookOpen, Video } from "lucide-react";

export const TeacherLinkManager = ({ teacherId, currentGrade }: { teacherId: string, currentGrade: string }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "", type: "classroom" });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch links for the specific grade
  useEffect(() => {
    const q = query(collection(db, "class_links"), where("grade", "==", currentGrade));
    const unsub = onSnapshot(q, (snap) => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentGrade]);

  const handleSaveLink = async () => {
    if (!newLink.title || !newLink.url) return;

    if (editingId) {
      await updateDoc(doc(db, "class_links", editingId), { ...newLink, updatedAt: serverTimestamp() });
      setEditingId(null);
    } else {
      await addDoc(collection(db, "class_links"), {
        ...newLink,
        grade: currentGrade,
        teacherId,
        createdAt: serverTimestamp()
      });
    }
    setNewLink({ title: "", url: "", type: "classroom" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this link?")) await deleteDoc(doc(db, "class_links", id));
  };

  return (
    <div className="space-y-6">
      {/* CREATE / EDIT FORM */}
      <Card className="border-2 border-dashed border-indigo-100 bg-indigo-50/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Link Title</label>
              <Input placeholder="e.g. Mathematics Textbook" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">URL</label>
              <Input placeholder="https://..." value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Type</label>
              <Select value={newLink.type} onValueChange={v => setNewLink({...newLink, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom/Video Link</SelectItem>
                  <SelectItem value="resource">Resource Material</SelectItem>
                  <SelectItem value="extra">Extra Reading</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveLink} className="bg-indigo-600 font-bold">
              {editingId ? "Update Link" : "Add New Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DISPLAY LINKS */}
      <div className="grid gap-4">
        {links.map(link => (
          <div key={link.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${link.type === 'classroom' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {link.type === 'classroom' ? <Video size={20}/> : <BookOpen size={20}/>}
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{link.title}</h4>
                <a href={link.url} target="_blank" className="text-xs text-blue-500 flex items-center gap-1">
                  {link.url.substring(0, 30)}... <ExternalLink size={12}/>
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(link.id); setNewLink({ title: link.title, url: link.url, type: link.type }); }}>
                <Edit3 size={16}/>
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(link.id)}>
                <Trash2 size={16}/>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};