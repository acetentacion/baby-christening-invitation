Add-Type -TypeDefinition @'
using System;
using System.IO;
public static class InvitationMusic {
  public static void Write(string path) {
    const int rate = 22050;
    const double beat = 0.75;
    int length = (int)(rate * beat * 48);
    double[] mix = new double[length];
    int[] melody = {76,79,81,79,76,72, 74,77,79,77,74,71,
                    72,76,79,76,74,72, 71,74,77,74,72,67,
                    76,79,84,81,79,76, 77,81,79,77,74,72,
                    74,76,79,76,74,71, 72,76,74,72,67,72};
    int[][] chords = {new[]{48,55,60},new[]{47,55,62},new[]{45,52,60},new[]{43,50,59},
                      new[]{48,55,64},new[]{41,48,57},new[]{43,50,59},new[]{48,55,60}};
    for(int n=0;n<melody.Length;n++) {
      Note(mix,rate,n*beat,melody[n],0.042,2.6);
      Note(mix,rate,n*beat,chords[n/6][n%3],0.022,3.2);
    }
    using(var w=new BinaryWriter(File.Create(path))) {
      w.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); w.Write(36+length*2);
      w.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); w.Write(16);
      w.Write((short)1); w.Write((short)1); w.Write(rate); w.Write(rate*2);
      w.Write((short)2); w.Write((short)16);
      w.Write(System.Text.Encoding.ASCII.GetBytes("data")); w.Write(length*2);
      foreach(double sample in mix) w.Write((short)(Math.Max(-0.16,Math.Min(0.16,sample))*32767));
    }
  }
  static void Note(double[] mix,int rate,double start,int midi,double gain,double duration) {
    double frequency=440*Math.Pow(2,(midi-69)/12.0);
    int offset=(int)(start*rate), count=(int)(duration*rate);
    for(int i=0;i<count;i++) {
      double t=(double)i/rate;
      double envelope=(1-Math.Exp(-t*45))*Math.Exp(-t*2.1)*Math.Min(1,(duration-t)/0.2);
      double phase=2*Math.PI*frequency*t;
      double sound=Math.Sin(phase)+0.18*Math.Sin(phase*2)*Math.Exp(-t*3);
      mix[(offset+i)%mix.Length]+=gain*envelope*sound;
    }
  }
}
'@
[InvitationMusic]::Write((Join-Path (Split-Path $PSScriptRoot -Parent) 'music.wav'))
