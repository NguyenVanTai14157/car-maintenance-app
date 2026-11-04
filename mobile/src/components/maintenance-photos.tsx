import React, {useState} from 'react';
import {View} from 'react-native';
import {Card,Heading,Body,Button,Photo,Feedback,useSubmit,pickPhoto,pickMaintenancePhotos,confirm} from './ui';
import {api} from '../services/api';
interface MaintenancePhoto {id:number;kind:string;data:string;}
interface Props {appointmentId:string;photos:MaintenancePhoto[];editable:boolean;reload:()=>Promise<void>;}
export function MaintenancePhotos(props:Props){
 return <>{['before','after'].map(kind=><PhotoGroup key={`${props.appointmentId}:${kind}`} {...props} kind={kind}/>)}</>;
}
function PhotoGroup({appointmentId,photos,editable,reload,kind}:Props&{kind:string}){
 const task=useSubmit();
 const [editing,setEditing]=useState<number|null>(null);
 const [uploaded,setUploaded]=useState(false);
 const items=photos.filter(photo=>photo.kind===kind);
 const title=kind==='before'?'Hình ảnh trước':'Hình ảnh sau';
 const send=async(action:string,body:object)=>{await api(`/appointments/${appointmentId}/action`,'POST',{action,...body});};
 return <Card>
  <Heading>{title}</Heading>
  {!items.length&&<Body>Chưa có hình ảnh.</Body>}
  {items.map((photo,index)=><Card key={photo.id}>
   <Body>Ảnh {index+1}</Body>
   <Photo uri={photo.data}/>
   {editable&&<>
    <View style={{flexDirection:'row',justifyContent:'flex-end',gap:8,marginTop:8}}>
     <Button title="Sửa" secondary disabled={task.busy} onPress={()=>setEditing(editing===photo.id?null:photo.id)}/>
     <Button title="Xóa" danger disabled={task.busy} onPress={()=>confirm('Xóa ảnh này?',()=>void task.run(async()=>{
      await send('photo_delete',{photo_id:photo.id});
      if(editing===photo.id)setEditing(null);
      if(items.length===1)setUploaded(false);
      await reload();
     },'Đã xóa ảnh.'))}/>
    </View>
    {editing===photo.id&&<View>
     <Body>Chọn ảnh mới để thay ảnh này.</Body>
     {[false,true].map(camera=><Button key={String(camera)} title={camera?'Chụp ảnh thay thế':'Chọn ảnh thay thế từ thư viện'} secondary disabled={task.busy} onPress={()=>task.run(async()=>{
      const data=await pickPhoto(camera);
      if(!data)return;
      await send('photo_update',{photo_id:photo.id,data});
      setEditing(null);await reload();
     },'')}/>)}
     <Button title="Hủy sửa" secondary disabled={task.busy} onPress={()=>setEditing(null)}/>
    </View>}
   </>}
  </Card>)}
  {editable&&!items.length&&!uploaded&&<Card>
   <Heading>{kind==='before'?'Tải ảnh trước':'Tải ảnh sau'}</Heading>
   <Body>Chọn một hoặc nhiều ảnh. Mục tải sẽ đóng sau khi lưu thành công.</Body>
   {[false,true].map(camera=><Button key={String(camera)} title={camera?'Chụp ảnh':'Chọn ảnh từ thư viện'} secondary disabled={task.busy} onPress={()=>task.run(async()=>{
    const images=await pickMaintenancePhotos(camera);if(!images.length)return;
    await send('photo',{kind,images});setUploaded(true);await reload();
   },'')}/>)}
  </Card>}
  <Feedback task={task}/>
 </Card>;
}
