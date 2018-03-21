
//获取坐标最值,参数features为geoJson的要素集,返回的是经纬度范围
function getRange(features) {
    var pts=[];//所有要素的geometry的点
    for(var i=0;i<features.length;i++){  //features.length对应多边形个数
        for(var j=0;j<features[i].geometry.coordinates.length;j++)
        {
            for(var k=0;k<features[i].geometry.coordinates[j].length;k++)
            {
                var pt=[features[i].geometry.coordinates[j][k][0] ,features[i].geometry.coordinates[j][k][1]];
                pts.push(pt);
            }
        }
    }
    var range={min_log:0, min_lat:0, max_log:100,max_lat:100};// log 经度  lat:纬度

    range.min_log=d3.min(pts,function (d) { return d[0];});
    range.min_lat=d3.min(pts,function (d) { return d[1];});
    range.max_log=d3.max(pts,function (d) { return d[0];});
    range.max_lat=d3.max(pts,function (d) { return d[1];});

    return range;
}

//获取不规则多边形重心,参数为多边形顶点集合
function getGravityCenter(pts) {
    var area=0,Gx=0,Gy=0,gravityCenter={x:0,y:0};
    for(var i=1;i<pts.length;i++)
    {
        var iX=pts[i][0],
            iY=pts[i][1],
            nextX=pts[i-1][0],
            nextY=pts[i-1][1],
            temp=(iX*nextY-iY*nextX)/2;
        area+=temp;
        Gx +=temp*(iX+nextX)/3;
        Gy +=temp*(iY+nextY)/3;
    }
    Gx=Gx/area;
    Gy=Gy/area;
    gravityCenter.x=Gx;
    gravityCenter.y=Gy;
    return gravityCenter;
}

