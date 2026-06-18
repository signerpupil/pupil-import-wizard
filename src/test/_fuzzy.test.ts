import { describe, it, expect } from 'vitest';
import { validateData } from '@/lib/fileParser';
import { schuelerColumns } from '@/types/importTypes';

function row(o:any){return{S_ID:'',S_Name:'',S_Vorname:'',S_Geschlecht:'m',S_Geburtsdatum:'01.01.2012',S_AHV:'',K_Name:'1A',P_ERZ1_ID:'',P_ERZ1_Name:'',P_ERZ1_Vorname:'',P_ERZ1_Strasse:'',P_ERZ1_Mobil:'',P_ERZ2_ID:'',P_ERZ2_Name:'',P_ERZ2_Vorname:'',...o};}

describe('fuzzy', ()=>{
  it('marko vs marco',()=>{
    const rows=[
      row({S_ID:'S1',S_Name:'Weber',S_Vorname:'Julia',P_ERZ1_ID:'EZB123',P_ERZ1_Name:'Weber',P_ERZ1_Vorname:'Marko',P_ERZ1_Strasse:'Hauptstrasse 5',P_ERZ1_Mobil:'076 123 45 45',P_ERZ2_ID:'445646',P_ERZ2_Name:'Weber',P_ERZ2_Vorname:'Anna'}),
      row({S_ID:'S2',S_Name:'Weber',S_Vorname:'Noah',P_ERZ1_ID:'EZB562',P_ERZ1_Name:'Weber',P_ERZ1_Vorname:'Marko',P_ERZ1_Strasse:'Hauptstrasse 5',P_ERZ1_Mobil:'076 123 45 45',P_ERZ2_ID:'445646',P_ERZ2_Name:'Weber',P_ERZ2_Vorname:'Anna'}),
      row({S_ID:'S3',S_Name:'Weber',S_Vorname:'Malena',P_ERZ1_ID:'EZB848',P_ERZ1_Name:'Weber',P_ERZ1_Vorname:'Marco',P_ERZ1_Strasse:'Hauptstrasse 5',P_ERZ1_Mobil:'076 123 45 45',P_ERZ2_ID:'445646',P_ERZ2_Name:'Weber',P_ERZ2_Vorname:'Anna'}),
    ];
    const errs=validateData(rows as any, schuelerColumns);
    const inc=errs.filter(e=>e.message.includes('Inkonsistente ID'));
    console.log('---');
    inc.forEach(e=>console.log(e.row, e.column, e.value, '|', e.message.slice(0,200)));
    console.log('---total', inc.length);
  });
});
